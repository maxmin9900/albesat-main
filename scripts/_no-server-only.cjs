// `server-only` is a build-time guard Next.js resolves itself; it is not an
// installed package. A plain `tsx script.ts` that imports anything from
// src/lib/** therefore fails on it. Requiring this file first makes the
// import a no-op so maintenance scripts can reuse the real service code
// instead of duplicating it.
const Module = require("node:module");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only" || request === "client-only") {
    return require.resolve("./_empty.cjs");
  }
  return resolve.call(this, request, ...rest);
};
