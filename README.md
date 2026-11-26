# Caelara Labs plugin for Claude Code

[![ci](https://github.com/caelara-labs/claude-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/caelara-labs/claude-plugin/actions/workflows/ci.yml)
[![shield-mcp](https://img.shields.io/npm/v/@caelaralabs/shield-mcp?label=shield-mcp&color=7FC8A0)](https://www.npmjs.com/package/@caelaralabs/shield-mcp)
[![mcp](https://img.shields.io/npm/v/@caelaralabs/mcp?label=mcp&color=7FC8A0)](https://www.npmjs.com/package/@caelaralabs/mcp)

The runtime security, scoped-key and verifiable audit layer that sits underneath coding-agent skills and MCP workflows.
By Caelara Labs (https://caelaralabs.com) · Software that decides, never custody.

Skills and MCP servers decide what an agent can do. This plugin decides whether each step should run: it screens what the
agent reads and sends before it acts, runs untrusted code in a network-isolated sandbox, gives sub-agents route-locked
sub-keys instead of your master key, holds high-impact changes for a person with a before and after diff, and backs every
decision with an Ed25519 receipt you verify offline.

## Install (two commands)

```text
/plugin marketplace add caelara-labs/claude-plugin
/plugin install caelara@caelara-labs
```

No key is ever written into this plugin. On first use the servers set up a trial key for this installation and keep it in
`~/.caelaralabs/credentials.json`; to use your own key, export `CAELARA_API_KEY` and `CAELARA_KEY` in your shell, or run
`npx -y @caelaralabs/shield-mcp init` once.

## See it catch a live attack

1. Open the Canary Trap: https://caelaralabs.com/shield/canary-trap/ . It is a harmless test page whose payload asks an
   agent to reveal its instructions, shown once in a visible block and once hidden in an HTML comment.
2. Copy the text of its "The test payload" block and ask the agent: `/caelara:screen <the pasted payload>`
3. The screen answers `block` with findings such as `instruction_override` and `system_prompt_exfil`, and the agent
   treats the payload as data instead of following it. Only a digest and the verdict are kept.

## What it adds

| Part | What it does |
|---|---|
| MCP server `caelara-shield` | `npx -y @caelaralabs/shield-mcp`: prompt, output, link and transaction screening |
| MCP server `caelara-edge` | `npx -y @caelaralabs/mcp`: the Caelara Labs edge tools over stdio |
| Skill `pre-execution-firewall` | Screens untrusted text, links and outgoing output, and stops on review or block |
| Skill `scoped-subkey-and-hitl-guard` | Scoped, expiring sub-keys, a policy guard over a payload digest, and a person for review |
| Skill `offline-receipt-and-sandbox` | Deterministic JS sandbox runs and offline Ed25519 receipt verification |
| `/caelara:screen <text, file or URL>` | Screen something before acting on it |
| `/caelara:sandbox <code> [input]` | Run JavaScript in the sandbox and verify its receipt |
| `/caelara:verify-receipt <receipt>` | Verify a receipt or signed pass offline |

## The six primitives it brings to an agent

1. Pre-execution firewall and anti-poisoning: screen before the agent reads or acts.
2. Offline-verifiable execution receipts (`oen-receipt/1`): Ed25519, checked without trusting the service.
3. Least-privilege scoped sub-key delegation: a hard cap, an expiry and an allow-list of routes.
4. Zero-signup machine discovery: `https://edge.caelaralabs.com/.well-known/open-edge.json` and each host's `/mcp`.
5. Deterministic JS sandboxing: no network, filesystem or environment; the same input always gives the same result.
6. Async human-in-the-loop approval with a before and after diff bound into the approval.

## Verify a receipt right now

No key and no network:

```bash
git clone https://github.com/caelara-labs/claude-plugin && cd claude-plugin
node examples/verify-receipt-offline.mjs
```

```text
key set:   2 Ed25519 keys (pinned copy, no network)
receipt:   bundled sample, signed by oen-e507b0f5aef381b9
claims:    execution_receipt · js · issued 2026-11-26T22:47:10.000Z
signature: VALID (checked locally in 1.4 ms)
tamper:    one changed character -> rejected, as it should be
```

## Properties

- No request text is kept by Caelara Labs: screening keeps SHA-256 digests and the verdict.
- No custody: Caelara Labs never holds your keys or funds and never signs or moves anything for you.
- Screening is heuristic and will miss some attacks. Keep a person in the loop for anything irreversible.

## Related

- MCP server for screening: https://github.com/caelara-labs/shield-mcp
- MCP server for the edge: https://github.com/caelara-labs/mcp
- n8n node: https://github.com/caelara-labs/n8n-nodes-caelara
- Workbench: https://workbench.caelaralabs.com

## Test

```bash
node --test test/*.test.mjs
```

## License

MIT. Powered by Caelara Labs · https://caelaralabs.com · ops@caelaralabs.com
