---
name: scoped-subkey-and-hitl-guard
description: Give an agent or script least-privilege access with a scoped, expiring Caelara sub-key, check an action against a policy before it runs, and route risky actions to a person with a before and after diff. Use when automating actions that change data, call external services or spend units, or when handing work to another agent.
---

# Scoped sub-key and human-in-the-loop guard

Least privilege for automation: the agent gets only the routes it needs, a hard cap and an expiry, and a person approves
anything the policy marks for review.

## 1. Mint a scoped sub-key (from a `ck_edge_` or `ck_pass_` key)

```bash
curl -s https://api.caelaralabs.com/v1/keys/delegate -H "X-Caelara-Key: $CAELARA_API_KEY" -H "Content-Type: application/json" \
  -d '{"max_egu": 20, "ttl_seconds": 900, "allowed_suites": ["guard", "hitl"]}'
```

The answer holds the sub-key once (`key`) and its `key_id`. Hand the sub-key to the agent through its environment, never
in a prompt, file or log, and refer to it afterwards only by `key_id`. A sub-key cannot mint further sub-keys, and any
route outside `allowed_suites` is refused.

## 2. Guard the action before it runs

Hash the payload locally and send only the digest:

```bash
curl -s https://api.caelaralabs.com/v1/guard/eval -H "X-Caelara-Key: $CAELARA_SUB_KEY" -H "Content-Type: application/json" \
  -d '{"action_type": "ticket.close", "payload_sha256": "<sha256 of the payload>", "policy": {"rules": [{"id": "tickets-only", "path": "action_type", "op": "starts_with", "value": "ticket."}], "on_fail": "review"}}'
```

The verdict is `allow`, `review` or `block`, with an Ed25519-signed pass (`signed_pass`). Verify the pass offline with the
`offline-receipt-and-sandbox` skill before relying on it.

## 3. Ask a person when the verdict is review

```bash
curl -s https://api.caelaralabs.com/v1/hitl/escalate -H "X-Caelara-Key: $CAELARA_API_KEY" -H "Content-Type: application/json" \
  -d '{"action_sha256": "<sha256>", "summary": "Close ticket 4211", "channel": "webhook", "target": "https://approvals.example.org/hook", "ttl_seconds": 600, "changes": [{"field": "status", "before": "open", "after": "closed"}]}'
```

A sub-key escalates only to its parent (`"target": "parent"`). Do not run the action until the approval arrives.

## 4. Revoke when done

```bash
curl -s -X DELETE https://api.caelaralabs.com/v1/keys/delegate/<key_id> -H "X-Caelara-Key: $CAELARA_API_KEY"
```

Unspent units return to the parent key. Caelara Labs never holds keys or funds and never acts for you: it decides and signs.

Key: the servers read `CAELARA_KEY` / `CAELARA_API_KEY` from the environment, or the key saved by `npx -y @caelaralabs/shield-mcp init` in `~/.caelaralabs/credentials.json`. When you call a route over HTTPS, send the key as `-H "X-Caelara-Key: $CAELARA_API_KEY"` so its value never appears in a command or in the transcript. Never print, echo or write a key into a file.
