import { webcrypto } from "node:crypto";

// Electron 26 ships Node 18, which has webcrypto but not globalThis.crypto.
// The bundled signing code reads the global.
if (typeof globalThis.crypto?.getRandomValues !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}
