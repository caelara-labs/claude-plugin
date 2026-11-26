#!/usr/bin/env node
// Verify a Caelara Labs receipt offline: an Ed25519 compact JWS checked against the published key set.
// Zero dependencies (node:crypto only), Node 18 or newer.
//
//   node examples/verify-receipt-offline.mjs                  the bundled sample receipt, against the pinned key set (no network)
//   node examples/verify-receipt-offline.mjs <receipt|file>   your own receipt or signed pass
//   node examples/verify-receipt-offline.mjs --live           refresh the key set from /.well-known/jwks.json first
//
// Receipts carry hashes and metadata only: no request or response text. Changing one character breaks the signature.
import { createPublicKey, verify } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const JWKS_URL = 'https://api.caelaralabs.com/.well-known/jwks.json'
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
export const sampleReceipt = () => fixture('sample-receipt.json').receipt
export const pinnedKeys = () => fixture('jwks.json').keys

const json = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))

// Returns { valid, kid, claims, reason }. A malformed or tampered receipt is simply not valid; it never throws.
export function verifyReceipt(jws, keys, now = Date.now()) {
  const parts = typeof jws === 'string' ? jws.trim().split('.') : []
  if (parts.length !== 3) return { valid: false, reason: 'malformed' }
  let header, claims
  try { header = json(parts[0]); claims = json(parts[1]) } catch { return { valid: false, reason: 'malformed' } }
  if (header.alg !== 'EdDSA') return { valid: false, kid: header.kid, reason: 'unsupported_alg' }
  const jwk = (keys ?? []).find((k) => k.kid === header.kid && k.kty === 'OKP' && k.crv === 'Ed25519')
  if (!jwk) return { valid: false, kid: header.kid, reason: 'unknown_key' }
  let ok = false
  try {
    const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, format: 'jwk' })
    ok = verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'))
  } catch { ok = false }
  if (!ok) return { valid: false, kid: header.kid, reason: 'bad_signature' }
  if (typeof claims.exp === 'number' && claims.exp * 1000 < now) return { valid: false, kid: header.kid, claims, reason: 'expired' }
  return { valid: true, kid: header.kid, claims }
}

// Flips one character of the claims: the signature must no longer match.
export function tamper(jws) {
  const [h, p, s] = jws.split('.')
  return `${h}.${p.slice(0, -2)}${p.at(-2) === 'A' ? 'B' : 'A'}${p.at(-1)}.${s}`
}

export async function fetchKeys(fetcher = fetch) {
  const r = await fetcher(JWKS_URL, { headers: { Accept: 'application/json', 'User-Agent': 'CaelaraLabs-Engine/1.0' } })
  if (!r.ok) throw new Error(`could not load the key set (HTTP ${r.status})`)
  return (await r.json()).keys ?? []
}

async function main(argv) {
  const live = argv.includes('--live')
  const arg = argv.find((a) => !a.startsWith('--'))
  const receipt = !arg ? sampleReceipt() : existsSync(arg) ? readFileSync(arg, 'utf8').trim() : arg
  const keys = live ? await fetchKeys() : pinnedKeys()
  const t0 = performance.now()
  const r = verifyReceipt(receipt, keys)
  const ms = (performance.now() - t0).toFixed(1)
  console.log(`key set:   ${keys.length} Ed25519 keys (${live ? 'fetched from ' + JWKS_URL : 'pinned copy, no network'})`)
  console.log(`receipt:   ${arg ? 'yours' : 'bundled sample'}, signed by ${r.kid ?? 'unknown'}`)
  if (r.claims) {
    const c = r.claims
    console.log(`claims:    ${[c.kind, c.runtime, c.verdict, c.action_type].filter(Boolean).join(' · ') || 'present'}${c.iat ? ' · issued ' + new Date(c.iat * 1000).toISOString() : ''}`)
  }
  console.log(`signature: ${r.valid ? `VALID (checked locally in ${ms} ms)` : `NOT VALID (${r.reason})`}`)
  if (r.valid) console.log(`tamper:    one changed character -> ${verifyReceipt(tamper(receipt), keys).valid ? 'still valid (unexpected)' : 'rejected, as it should be'}`)
  process.exitCode = r.valid ? 0 : 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exitCode = 1 })
}
