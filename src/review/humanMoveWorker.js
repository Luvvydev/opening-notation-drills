import { Maia3 } from 'maia3-js/web';

// Maia3 learns move choices from human games. Run its optional comparison
// in a worker so model loading and inference do not block Game Review.
const assetBase = new URL('./', self.location.href).href;
let modelPromise;

function loadModel() {
  if (!modelPromise) {
    modelPromise = Promise.resolve().then(async () => {
      const model = new Maia3({ variant: '5m', url: new URL('maia3_5m.onnx', assetBase).href, numThreads: 1, wasmPaths: assetBase });
      await model.load();
      return model;
    }).catch((error) => {
      modelPromise = null;
      throw error;
    });
  }
  return modelPromise;
}

self.onmessage = async ({ data: { id, fen, priorFens, selfElo, oppoElo } }) => {
  try {
    const model = await loadModel();
    const { moves } = await model.predict({ fen, priorFens, selfElo, oppoElo, topK: 0 });
    self.postMessage({ id, moves: Array.from(moves) });
  } catch (_) {
    self.postMessage({ id, failed: true });
  }
};
