---
description: Verify a Caelara receipt or signed pass offline against the published Ed25519 key set
argument-hint: <jws-or-sha256> [--live]
---

Verify this receipt offline: $ARGUMENTS

1. If the argument is a compact JWS (three base64url parts), run `node "${CLAUDE_PLUGIN_ROOT}/examples/verify-receipt-offline.mjs" $ARGUMENTS`. With no argument it verifies the bundled sample receipt.
   If it is a 64-character SHA-256 receipt hash, a hash alone carries no signature: ask for the receipt (the compact JWS) it belongs to, or compare the hash with the `receipt_hash` of a receipt you already hold.
2. Report VALID or NOT VALID with the reason, the key id, and the claims (kind, verdict or hashes, issued and expiry times).
3. If the script cannot run here, POST `{"receipt": "..."}` to `https://api.caelaralabs.com/v1/receipts/verify` (no key needed) and say that the check was online.

A one-character change to a receipt makes it NOT VALID; that is the point.
