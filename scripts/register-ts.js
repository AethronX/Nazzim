// Lets plain `node` require the app's TypeScript modules (pure logic only: domain, engine, ai).
const ts = require('typescript');
const fs = require('fs');
const Module = require('module');
const path = require('path');

require.extensions['.ts'] = (mod, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  mod._compile(out, filename);
};

// Resolve extensionless relative imports ('../lib/exams') to .ts files.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('.') && parent && !path.extname(request)) {
    const base = path.resolve(path.dirname(parent.filename), request);
    if (fs.existsSync(base + '.ts')) return base + '.ts';
  }
  return resolve.call(this, request, parent, ...rest);
};
global.__DEV__ = false;
