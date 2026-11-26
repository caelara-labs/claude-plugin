---
description: Verify a Caelara receipt or signed pass offline against the published Ed25519 key set
argument-hint: <compact JWS or file path> [--live]
---

Verify this receipt offline: $ARGUMENTS

1. Run `node "${CLAUDE_PLUGIN_ROOT}/examples/verify-receipt-offline.mjs" $ARGUMENTS`. With no argument it verifies the bundled sample receipt.
2. Report VALID or NOT VALID with the reason, the key id, and the claims (kind, verdict or hashes, issued and expiry times).
3. If the script cannot run here, POST `{"receipt": "..."}` to `https://api.caelaralabs.com/v1/receipts/verify` (no key needed) and say that the check was online.

A one-character change to a receipt makes it NOT VALID; that is the point.
