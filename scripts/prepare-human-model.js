const { copyFile, mkdir, stat } = require('fs/promises');
const path = require('path');

const project = path.join(__dirname, '..');
const directory = path.join(project, 'public', 'engines', 'human-model');
const maia = path.join(project, 'node_modules', 'maia3-js');
const runtimeFiles = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
const preparedFiles = ['worker.js', 'maia3_5m.onnx', 'MAIA_PACKAGE_LICENSE.txt', ...runtimeFiles];

async function hasPreparedModel() {
  const files = await Promise.all(preparedFiles.map((file) =>
    stat(path.join(directory, file)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    })
  ));
  return files.every((file) => file && file.isFile() && file.size > 0);
}

async function prepareModel() {
  const weights = path.join(maia, 'models', 'maia3_5m.onnx');
  let build;
  let ort;
  try {
    ({ build } = require('esbuild'));
    ort = path.dirname(require.resolve('onnxruntime-web/wasm'));
    await stat(weights);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' && error.code !== 'ENOENT') throw error;
    if (await hasPreparedModel()) return;
    throw new Error('Maia assets and build dependencies are missing. Run npm ci or extract the Maia worker repair ZIP into the project root.');
  }

  await mkdir(directory, { recursive: true });
  await Promise.all([
    build({
      entryPoints: [path.join(project, 'src', 'review', 'humanMoveWorker.js')],
      outfile: path.join(directory, 'worker.js'),
      bundle: true,
      minify: true,
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      alias: { 'onnxruntime-web': 'onnxruntime-web/wasm' },
    }),
    copyFile(weights, path.join(directory, 'maia3_5m.onnx')),
    copyFile(path.join(maia, 'LICENSE'), path.join(directory, 'MAIA_PACKAGE_LICENSE.txt')),
    ...runtimeFiles.map((file) =>
      copyFile(path.join(ort, file), path.join(directory, file))
    ),
  ]);
}

prepareModel().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
