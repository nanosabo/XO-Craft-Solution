import "./nodeWebCrypto";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

const keyCache = new Map<string, Uint8Array>();

const asBytes = (value: Uint8Array): Uint8Array =>
  new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

/** A fresh ArrayBuffer-backed view. Newer Node types reject Buffer as Uint8Array. */
const bytes = (value: ArrayLike<number>): Uint8Array => {
  const copy = new Uint8Array(value.length);

  copy.set(value);

  return copy;
};

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }

  return out;
};

export const roomIdFor = (code: string): string =>
  createHash("sha256")
    .update(`xocs-clan-room:${code.trim()}`)
    .digest("hex")
    .slice(0, 32);

const cipherKeyFor = (code: string): Uint8Array => {
  const normalized = code.trim();
  const cached = keyCache.get(normalized);

  if (cached) return cached;

  const key = bytes(scryptSync(normalized, "xocs-clan-v1", 32));

  keyCache.set(normalized, key);

  return key;
};

export const encryptPayload = (code: string, payload: unknown): string => {
  const iv = bytes(randomBytes(12));
  const cipher = createCipheriv("aes-256-gcm", cipherKeyFor(code), iv);
  const body = concat(
    bytes(cipher.update(JSON.stringify(payload), "utf8")),
    bytes(cipher.final()),
  );
  const tag = bytes(cipher.getAuthTag());

  return `v1:${Buffer.from(concat(iv, tag, body)).toString("base64")}`;
};

export const decryptPayload = (code: string, content: string): unknown => {
  if (!content.startsWith("v1:")) return null;

  const raw = bytes(Buffer.from(content.slice(3), "base64"));

  if (raw.length < 28) return null;

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const body = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", cipherKeyFor(code), iv);

  decipher.setAuthTag(tag);

  const json = Buffer.from(
    concat(bytes(decipher.update(body)), bytes(decipher.final())),
  ).toString("utf8");

  return JSON.parse(json) as unknown;
};

export const createSecretKey = (): string => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const secret = bytes(randomBytes(32));

    try {
      schnorr.getPublicKey(secret);

      return bytesToHex(secret);
    } catch {
      // A random 32-byte key can fall outside the curve order.
    }
  }

  throw new Error("Could not create a clan key.");
};

export const publicKeyOf = (secretKey: string): string =>
  bytesToHex(schnorr.getPublicKey(hexToBytes(secretKey)));

export const signEvent = (
  secretKey: string,
  kind: number,
  tags: string[][],
  content: string,
  createdAt = Math.floor(Date.now() / 1000),
): NostrEvent => {
  const pubkey = publicKeyOf(secretKey);
  const serialized = JSON.stringify([0, pubkey, createdAt, kind, tags, content]);
  const idBytes = asBytes(sha256(new TextEncoder().encode(serialized)));
  const id = bytesToHex(idBytes);
  const sig = bytesToHex(schnorr.sign(idBytes, hexToBytes(secretKey)));

  return {
    id,
    pubkey,
    created_at: createdAt,
    kind,
    tags,
    content,
    sig,
  };
};

export const verifyEvent = (event: NostrEvent): boolean => {
  if (
    !/^[0-9a-f]{64}$/.test(event.id) ||
    !/^[0-9a-f]{64}$/.test(event.pubkey) ||
    !/^[0-9a-f]{128}$/.test(event.sig)
  ) {
    return false;
  }

  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const idBytes = asBytes(sha256(new TextEncoder().encode(serialized)));

  if (bytesToHex(idBytes) !== event.id) return false;

  return schnorr.verify(hexToBytes(event.sig), idBytes, hexToBytes(event.pubkey));
};

export const payloadHash = (payload: unknown): string =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");
