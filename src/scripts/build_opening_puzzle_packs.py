#!/usr/bin/env python3
import csv
import json
import re
import sys
from pathlib import Path

try:
    import zstandard as zstd
except Exception:
    zstd = None

CANONICAL_OPENING_PUZZLE_TAG_PREFIXES = {
    "london": ["Queens_Pawn_Game_London_System"],
    "sicilian": ["Sicilian_Defense"],
    "ruy": ["Ruy_Lopez"],
    "friedliver": ["Italian_Game_Two_Knights_Defense_Fried_Liver_Attack", "Italian_Game"],
    "stafford": ["Petrovs_Defense_Stafford_Gambit", "Petrovs_Defense"],
    "carokann": ["Caro-Kann_Defense"],
    "qga": ["Queens_Gambit_Accepted"],
    "qgd": ["Queens_Gambit_Declined"],
    "italian": ["Italian_Game"],
    "kingsindian": ["Kings_Indian_Defense", "Indian_Defense_Kings_Indian_Variation"],
    "french": ["French_Defense"],
    "englund": ["Englund_Gambit"],
    "english": ["English_Opening"],
    "scotchgame": ["Scotch_Game"],
    "vienna": ["Vienna_Gambit", "Vienna_Game"],
    "viennaCounter": ["Vienna_Gambit", "Vienna_Game"],
    "rousseauGambit": ["Italian_Game_Rousseau_Gambit", "Italian_Game"],
    "bishopsOpening": ["Bishops_Opening"],
    "viennaGame": ["Vienna_Game"],
    "kingsGambit": ["Kings_Gambit"],
    "danishGambit": ["Danish_Gambit"],
    "scandinavianDefense": ["Scandinavian_Defense"],
    "vantKruijs": ["Vant_Kruijs_Opening"],
    "petrovDefense": ["Petrovs_Defense"],
}

LEGACY_OPENING_KEY_ALIASES = {
    "kingsgambit": "kingsGambit",
    "petrov": "petrovDefense",
    "scandinavian": "scandinavianDefense",
}

LIMIT_PER_OPENING = 80

PRIMARY_MIN_POPULARITY = 50
PRIMARY_MAX_RATING_DEVIATION = 95

FALLBACK_MIN_POPULARITY = 10
FALLBACK_MAX_RATING_DEVIATION = 130


def open_input(path: Path):
    if path.suffix == ".zst":
        if zstd is None:
            raise SystemExit("Install zstandard first: pip install zstandard")
        fh = path.open("rb")
        dctx = zstd.ZstdDecompressor()
        stream = dctx.stream_reader(fh)
        return stream, True
    return path.open("r", encoding="utf-8", newline=""), False


def read_opening_catalog_keys() -> set[str]:
    catalog_path = Path(__file__).resolve().parents[1] / "openings" / "openingCatalog.js"
    if not catalog_path.exists():
        return set()
    text = catalog_path.read_text(encoding="utf-8")
    return set(re.findall(r'key:\s*"([^"]+)"', text))


def tag_matches_prefix(tag: str, prefix: str) -> bool:
    return tag == prefix or tag.startswith(prefix + "_")


def collect_matched_keys(opening_tags, prefix_to_keys):
    matched_keys = set()
    for tag in opening_tags:
        for prefix, keys in prefix_to_keys:
            if tag_matches_prefix(tag, prefix):
                matched_keys.update(keys)
    return matched_keys


def maybe_add_puzzle(target_pack, seen_ids, puzzle, limit):
    if len(target_pack) >= limit:
        return
    if puzzle["id"] in seen_ids:
        return
    target_pack.append(puzzle)
    seen_ids.add(puzzle["id"])


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python3 src/scripts/build_opening_puzzle_packs.py path/to/lichess_db_puzzle.csv.zst")

    src_path = Path(sys.argv[1]).expanduser().resolve()
    out_path = Path(__file__).resolve().parents[1] / "data" / "generatedOpeningPuzzles.js"

    expected_catalog_keys = read_opening_catalog_keys()
    mapped_keys = set(CANONICAL_OPENING_PUZZLE_TAG_PREFIXES)
    missing_mappings = sorted(expected_catalog_keys - mapped_keys)
    extra_mappings = sorted(mapped_keys - expected_catalog_keys)
    if missing_mappings:
        print("Warning: openingCatalog.js has keys without puzzle mappings:", ", ".join(missing_mappings), file=sys.stderr)
    if extra_mappings:
        print("Note: puzzle mappings exist for keys not found in openingCatalog.js:", ", ".join(extra_mappings), file=sys.stderr)

    prefix_to_keys = []
    for key, prefixes in CANONICAL_OPENING_PUZZLE_TAG_PREFIXES.items():
        for prefix in prefixes:
            prefix_to_keys.append((prefix, {key}))

    packs = {key: [] for key in CANONICAL_OPENING_PUZZLE_TAG_PREFIXES}
    fallback_packs = {key: [] for key in CANONICAL_OPENING_PUZZLE_TAG_PREFIXES}
    seen_primary_ids = {key: set() for key in CANONICAL_OPENING_PUZZLE_TAG_PREFIXES}
    seen_fallback_ids = {key: set() for key in CANONICAL_OPENING_PUZZLE_TAG_PREFIXES}

    handle, binary = open_input(src_path)
    try:
        if binary:
            import io
            text_stream = io.TextIOWrapper(handle, encoding="utf-8", newline="")
            reader = csv.DictReader(text_stream)
        else:
            reader = csv.DictReader(handle)

        for row in reader:
            opening_tags = [t for t in str(row.get("OpeningTags") or "").split() if t]
            if not opening_tags:
                continue

            matched_keys = collect_matched_keys(opening_tags, prefix_to_keys)
            if not matched_keys:
                continue

            rating = int(row.get("Rating") or 0)
            rating_deviation = int(row.get("RatingDeviation") or 999)
            popularity = int(row.get("Popularity") or -999)

            passes_primary = (
                popularity >= PRIMARY_MIN_POPULARITY and
                rating_deviation <= PRIMARY_MAX_RATING_DEVIATION
            )
            passes_fallback = (
                popularity >= FALLBACK_MIN_POPULARITY and
                rating_deviation <= FALLBACK_MAX_RATING_DEVIATION
            )
            if not passes_primary and not passes_fallback:
                continue

            puzzle = {
                "id": row.get("PuzzleId"),
                "fen": row.get("FEN"),
                "moves": str(row.get("Moves") or "").split(),
                "rating": rating,
                "themes": str(row.get("Themes") or "").split(),
                "openingTags": opening_tags,
                "source": "Lichess open database"
            }
            if not puzzle["id"] or not puzzle["fen"] or len(puzzle["moves"]) < 2:
                continue

            for key in matched_keys:
                if passes_primary:
                    maybe_add_puzzle(packs[key], seen_primary_ids[key], puzzle, LIMIT_PER_OPENING)
                elif passes_fallback:
                    maybe_add_puzzle(fallback_packs[key], seen_fallback_ids[key], puzzle, LIMIT_PER_OPENING)

            if all(len(v) >= LIMIT_PER_OPENING for v in packs.values()):
                break
    finally:
        handle.close()

    for key, relaxed_candidates in fallback_packs.items():
        if len(packs[key]) >= LIMIT_PER_OPENING:
            continue
        primary_seen = seen_primary_ids[key]
        for puzzle in relaxed_candidates:
            if len(packs[key]) >= LIMIT_PER_OPENING:
                break
            if puzzle["id"] in primary_seen:
                continue
            packs[key].append(puzzle)
            primary_seen.add(puzzle["id"])

    for legacy_key, canonical_key in LEGACY_OPENING_KEY_ALIASES.items():
        packs[legacy_key] = list(packs.get(canonical_key, []))

    js = "export const GENERATED_OPENING_PUZZLES = " + json.dumps(packs, indent=2) + ";\n"
    out_path.write_text(js, encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
