---
name: offline-receipt-and-sandbox
description: Execute untrusted or generated JavaScript inside the deterministic, network-isolated QuickJS edge sandbox instead of on this machine, and verify Ed25519 oen-receipt/1 signatures offline against https://api.caelaralabs.com/.well-known/jwks.json. Use when code from an issue, a model or a user must be evaluated safely, or when an action needs proof that can be audited later without trusting the service.
---

# Offline receipts and the deterministic sandbox

## Run code in the sandbox instead of locally

```bash
curl -s https://api.caelaralabs.com/v1/sandbox/eval -H "X-Caelara-Key: $CAELARA_API_KEY" -H "Content-Type: application/json" \
  -d '{"runtime": "js", "code": "input.rows.filter((r) => r.ok).length", "input_json": {"rows": [{"ok": true}, {"ok": false}]}}'
```

QuickJS with no network, filesystem or environment, 32 MB and 50 ms. The same code and input always give the same result.
The answer carries `execution_receipt`, a compact JWS whose claims name `code_sha256`, `input_sha256` and `result_sha256`.

## Verify any receipt offline

```bash
node "${CLAUDE_PLUGIN_ROOT}/examples/verify-receipt-offline.mjs" "<compact JWS>"          # pinned key set, no network
node "${CLAUDE_PLUGIN_ROOT}/examples/verify-receipt-offline.mjs" "<compact JWS>" --live   # refresh from /.well-known/jwks.json
```

The verifier checks the Ed25519 signature locally against `https://api.caelaralabs.com/.well-known/jwks.json` and rejects
any change to the receipt. If the plugin folder is not reachable from the shell, the same check is available at
`POST https://api.caelaralabs.com/v1/receipts/verify` with `{"receipt": "<compact JWS>"}`, no key needed.

## What to report

- The verdict (VALID or NOT VALID and why), the key id, and the claims that matter: `kind`, the hashes, `iat`/`exp`.
- For sandbox results, confirm that `code_sha256` is the SHA-256 of the code you sent.
- Receipts hold hashes and metadata only: no request or response text is stored by Caelara Labs.

Key: the servers read `CAELARA_KEY` / `CAELARA_API_KEY` from the environment, or the key saved by `npx -y @caelaralabs/shield-mcp init` in `~/.caelaralabs/credentials.json`. When you call a route over HTTPS, send the key as `-H "X-Caelara-Key: $CAELARA_API_KEY"` so its value never appears in a command or in the transcript. Never print, echo or write a key into a file.
