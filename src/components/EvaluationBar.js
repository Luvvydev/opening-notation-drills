import React, { useEffect, useRef, useState } from 'react';
import * as ChessModule from 'chess.js';
import { getPositionLabel, getPositionWinPercentage, parseEvaluationResults } from '../review/positionEvaluation';
import { createReviewWorkerHandle, disposeReviewWorkerHandle, LEGACY_ENGINE_PATH, sendCommandsToWorker, WASM_ENGINE_PATH } from '../review/stockfishWorker';
import './EvaluationBar.css';

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;

async function startEvaluationWorker(signal) {
  if (typeof window.WebAssembly !== 'undefined') {
    try {
      return await createReviewWorkerHandle(WASM_ENGINE_PATH, 1, signal);
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return createReviewWorkerHandle(LEGACY_ENGINE_PATH, 1, signal);
}

export default function EvaluationBar({ evaluation, orientation = 'white', unavailable = false, previousEvaluation }) {
  const hasScore = Boolean(evaluation?.lines?.length);
  // Keep the rail steady while the next position is being evaluated.
  const railEvaluation = evaluation || previousEvaluation;
  const whitePercent = railEvaluation?.checkmated === 'b' ? 100 : getPositionWinPercentage(railEvaluation);
  const score = hasScore ? getPositionLabel(evaluation) : '…';
  const description = hasScore ? `White winning chances: ${Math.round(whitePercent)}%`
    : unavailable ? 'Position evaluation unavailable' : 'Evaluating position';

  return (
    <div className={`position-eval${orientation === 'black' ? ' is-flipped' : ''}`} role="progressbar"
      aria-label="White position evaluation" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={hasScore ? Math.round(whitePercent) : undefined} aria-valuetext={hasScore ? score : description} title={description}>
      <div className="position-eval-white" style={{ height: `${whitePercent}%` }} />
      <span className="position-eval-value">{score}</span>
    </div>
  );
}

export function LiveEvaluationBar({ fen, orientation, drawn = false }) {
  const sessionRef = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const session = { controller, worker: null, pending: Promise.resolve() };
    sessionRef.current = session;
    return () => {
      controller.abort();
      disposeReviewWorkerHandle(session.worker);
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const session = sessionRef.current;
    const { signal } = session.controller;
    let current = true;
    const timer = window.setTimeout(() => {
      // Let the current search drain before sending a new position to the same worker.
      session.pending = session.pending.then(async () => {
        if (!current || signal.aborted) return;

        try {
          const game = fen === 'start' ? new Chess() : new Chess(fen);
          let evaluation;
          if (game.in_checkmate()) {
            // Stockfish emits no usable PV for a finished game.
            evaluation = { lines: [{ mate: 0 }], checkmated: game.turn() };
          } else if (drawn || game.in_draw()) {
            evaluation = { lines: [{ cp: 0 }] };
          } else {
            const position = game.fen();
            if (!session.worker) {
              const worker = await startEvaluationWorker(signal);
              if (signal.aborted) {
                disposeReviewWorkerHandle(worker);
                return;
              }
              session.worker = worker;
            }
            if (!current) return;

            const messages = await sendCommandsToWorker(
              session.worker, [`position fen ${position}`, 'go depth 12 movetime 250'], 'bestmove', null, 4000
            );
            evaluation = parseEvaluationResults(messages, position);
          }
          if (current) setResult({ fen, drawn, evaluation, unavailable: !evaluation.lines.length });
        } catch (_) {
          disposeReviewWorkerHandle(session.worker);
          session.worker = null;
          if (current) setResult({ fen, drawn, unavailable: true });
        }
      });
    }, 120);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [fen, drawn]);

  const displayed = result && result.fen === fen && result.drawn === drawn ? result : null;
  return <EvaluationBar evaluation={displayed?.evaluation} previousEvaluation={displayed ? null : result?.evaluation}
    orientation={orientation} unavailable={displayed?.unavailable} />;
}
