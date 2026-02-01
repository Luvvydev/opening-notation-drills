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
          Moves (SAN, separated by spaces, commas, or new lines)
          <textarea
            className="ot-modal-textarea"
            value={props.movesText || ""}
            onChange={(e) => props.onChangeMovesText && props.onChangeMovesText(e.target.value)}
            placeholder="d4 d5 Bf4 Nf6 e3 e6 Nd2 c5 c3 Nc6"
          />
        </label>

        <div className="ot-modal-actions">
          <button className="ot-button ot-button-small" onClick={props.onCancel}>
            Cancel
          </button>
          <button className="ot-button ot-button-small ot-button-primary" onClick={props.onSave}>
            Save
          </button>
        </div>

        <div className="ot-modal-hint">
          Tip: use standard SAN like Nf3, Bb5, O-O, exd5, Qxd8.
        </div>
      </div>
    </div>
  );
}
