export const LEGACY_ENGINE_PATH = '/engines/stockfish-worker.js';
export const WASM_ENGINE_PATH = '/engines/stockfish-17/stockfish-17-lite-single.js';

export function sendCommandsToWorker(workerHandle, commands, finalPrefix, onMessage, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (workerHandle.failed) {
      reject(new Error('Stockfish worker is unavailable'));
      return;
    }

    const messages = [];
    let finished = false;
    let timeoutId = null;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (workerHandle.listener === receive) {
        workerHandle.listener = null;
        workerHandle.rejectCommand = null;
      }
      if (error) reject(error);
      else resolve(messages);
    };
    const receive = (data) => {
      const text = String(data || '');
      messages.push(text);
      if (onMessage) onMessage(messages, text);
      if (text.startsWith(finalPrefix)) finish();
    };
    workerHandle.listener = receive;
    workerHandle.rejectCommand = finish;
    if (timeoutMs) {
      timeoutId = window.setTimeout(() => finish(new Error(`Worker timeout waiting for ${finalPrefix}`)), timeoutMs);
    }

    try {
      commands.forEach((command) => workerHandle.worker.postMessage(command));
    } catch (error) {
      finish(error);
    }
  });
}

export async function createReviewWorkerHandle(enginePath, multiPv, signal) {
  const worker = new window.Worker(enginePath);
  const handle = { worker, enginePath, listener: null, rejectCommand: null, multiPv, busy: false };
  worker.onmessage = (event) => {
    if (handle.listener) handle.listener(String(event.data || ''));
  };
  worker.onerror = () => {
    handle.failed = true;
    if (handle.rejectCommand) handle.rejectCommand(new Error('Stockfish worker failed'));
  };

  const abort = () => disposeReviewWorkerHandle(handle);
  if (signal) signal.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) throw new Error('Stockfish startup cancelled');
    await sendCommandsToWorker(handle, ['uci'], 'uciok', null, 10000);
    await sendCommandsToWorker(handle, [`setoption name MultiPV value ${multiPv}`, 'isready'], 'readyok', null, 10000);
    return handle;
  } catch (error) {
    disposeReviewWorkerHandle(handle);
    throw error;
  } finally {
    if (signal) signal.removeEventListener('abort', abort);
  }
}

export function disposeReviewWorkerHandle(handle) {
  if (!handle || handle.disposed) return;
  handle.disposed = true;
  handle.failed = true;
  if (handle.rejectCommand) handle.rejectCommand(new Error('Stockfish worker closed'));
  try { handle.worker.postMessage('quit'); } catch (_) {}
  try { handle.worker.terminate(); } catch (_) {}
}
