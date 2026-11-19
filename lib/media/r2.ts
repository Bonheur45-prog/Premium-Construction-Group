import "server-only";

import { createHash, createHmac } from "node:crypto";

/**
 * Minimal Cloudflare R2 client (S3 API, Signature V4) — upload, delete and time-limited private links.
 * No AWS SDK needed, which keeps the server bundle and memory small.
 *
 * Environment:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_PUBLIC_BUCKET  + R2_PUBLIC_URL   – website media (images/videos), served from e.g. https://media.zamukapos.io
 *   R2_PRIVATE_BUCKET                   – client documents; never public, only reachable through signed links
 */
export type R2Bucket = "public" | "private";

function bucketName(bucket: R2Bucket) {
  return (bucket === "public" ? process.env.R2_PUBLIC_BUCKET : process.env.R2_PRIVATE_BUCKET) || "";
}

export function r2Configured(bucket: R2Bucket) {
  const base = Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && bucketName(bucket));
  return bucket === "public" ? base && Boolean(process.env.R2_PUBLIC_URL) : base;
}

export function r2PublicUrl(key: string) {
  return `${(process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "")}/${key.split("/").map(encodeRfc3986).join("/")}`;
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();

function signingKey(dateStamp: string) {
  const kDate = hmac(`AWS4${process.env.R2_SECRET_ACCESS_KEY}`, dateStamp);
  return hmac(hmac(hmac(kDate, "auto"), "s3"), "aws4_request");
}

function timestamps() {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function objectLocation(bucket: R2Bucket, key: string) {
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const path = `/${bucketName(bucket)}/${key.split("/").map(encodeRfc3986).join("/")}`;
  return { host, path, url: `https://${host}${path}` };
}

async function signedFetch(method: "PUT" | "DELETE", bucket: R2Bucket, key: string, body?: Uint8Array, extraHeaders: Record<string, string> = {}) {
  const { host, path, url } = objectLocation(bucket, key);
  const { amzDate, dateStamp } = timestamps();
  const headers: Record<string, string> = { host, "x-amz-content-sha256": "UNSIGNED-PAYLOAD", "x-amz-date": amzDate };
  for (const [name, value] of Object.entries(extraHeaders)) headers[name.toLowerCase()] = value;
  const names = Object.keys(headers).sort();
  const canonicalRequest = [method, path, "", names.map((name) => `${name}:${headers[name].trim()}\n`).join(""), names.join(";"), "UNSIGNED-PAYLOAD"].join("\n");
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(dateStamp)).update(stringToSign).digest("hex");
  const { host: _host, ...sendHeaders } = headers;
  void _host;
  const response = await fetch(url, {
    method,
    headers: { ...sendHeaders, Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` },
    body: body ? Buffer.from(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok && !(method === "DELETE" && response.status === 404)) {
    throw new Error(`R2 ${method} failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
}

export async function r2Put(bucket: R2Bucket, key: string, body: Uint8Array, contentType: string, cacheControl = "public, max-age=31536000, immutable") {
  await signedFetch("PUT", bucket, key, body, { "content-type": contentType, "cache-control": cacheControl, "content-length": String(body.byteLength) });
}

export async function r2Delete(bucket: R2Bucket, key: string) {
  await signedFetch("DELETE", bucket, key);
}

/** A link that works for `expiresSeconds` only — used for private client documents. */
export function r2SignedGetUrl(bucket: R2Bucket, key: string, expiresSeconds = 300, downloadName?: string, inline = false) {
  const { host, path, url } = objectLocation(bucket, key);
  const { amzDate, dateStamp } = timestamps();
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${process.env.R2_ACCESS_KEY_ID}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.min(Math.max(expiresSeconds, 30), 3600)),
    "X-Amz-SignedHeaders": "host",
  };
  if (downloadName) {
    const safe = downloadName.replace(/["\\\r\n]/g, "").slice(0, 150) || "file";
    params["response-content-disposition"] = `${inline ? "inline" : "attachment"}; filename="${safe.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeRfc3986(safe)}`;
  }
  const query = Object.keys(params).sort().map((name) => `${encodeRfc3986(name)}=${encodeRfc3986(params[name])}`).join("&");
  const canonicalRequest = ["GET", path, query, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(dateStamp)).update(stringToSign).digest("hex");
  return `${url}?${query}&X-Amz-Signature=${signature}`;
}
