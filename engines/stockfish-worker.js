self.global = self;
self.globalThis = self;
self.process = self.process || { env: {}, argv: [] };
self.Module = self.Module || {};

importScripts('./stockfish-11.js');
