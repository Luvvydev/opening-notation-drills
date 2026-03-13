import React from "react";

export default function OpeningTrainerCustomModal(props) {
  if (!props || !props.open) return null;

  return (
    <div className="ot-modal-overlay" onMouseDown={props.onCancel}>
      <div className="ot-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ot-modal-title">Add custom rep</div>

        {props.error ? <div className="ot-modal-error">{props.error}</div> : null}

        <label className="ot-modal-label">
          Name (optional)
          <input
            className="ot-modal-input"
            value={props.name || ""}
            onChange={(e) => props.onChangeName && props.onChangeName(e.target.value)}
            placeholder="Example: My London vs Qb6"
          />
        </label>

        <label className="ot-modal-label">
          Moves or position
          <textarea
            className="ot-modal-textarea"
            value={props.movesText || ""}
            onChange={(e) => props.onChangeMovesText && props.onChangeMovesText(e.target.value)}
            placeholder={`d4 d5 Bf4 Nf6 e3 e6 Nd2 c5 c3 Nc6

[Event "Example"]
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6

Or paste a FEN position`}
          />
        </label>

        <div className="ot-modal-detected-row">
          <span className="ot-modal-detected-label">Detected</span>
          <span className="ot-modal-detected-value">{props.detectedFormatLabel || "Nothing yet"}</span>
        </div>

        <div className="ot-modal-actions">
          <button className="ot-button ot-button-small" onClick={props.onCancel}>
            Cancel
          </button>
          <button className="ot-button ot-button-small ot-button-primary" onClick={props.onSave}>
            Save
          </button>
        </div>

        <div className="ot-modal-hint">
          Paste SAN, a full PGN, or a FEN. SAN and PGN save as drills. FEN saves a review position.
        </div>
      </div>
    </div>
  );
}
