---
description: Run JavaScript in the deterministic Caelara edge sandbox and verify its execution receipt offline
argument-hint: <js-expression> [input JSON]
---

Run this in the Caelara edge sandbox, not on this machine: $ARGUMENTS

1. If the argument is a file path, read it; the completion value of the code is the result, and `input` holds the input JSON.
2. POST it to `https://api.caelaralabs.com/v1/sandbox/eval` with `{"runtime": "js", "code": ..., "input_json": ...}`, sending the key as `-H "X-Caelara-Key: $CAELARA_API_KEY"` (never type the key itself).
3. Verify `execution_receipt` with `node "${CLAUDE_PLUGIN_ROOT}/examples/verify-receipt-offline.mjs" "<receipt>"`, and check that `code_sha256` equals the SHA-256 of the code sent.
4. Report the result, exit code, duration, the receipt verdict and the key id.

No network, filesystem or environment inside the sandbox; 50 ms and 32 MB.
