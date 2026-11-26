// node --test test/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { verifyReceipt, sampleReceipt, pinnedKeys, tamper } from '../examples/verify-receipt-offline.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (p) => readFileSync(join(root, p), 'utf8')
const json = (p) => JSON.parse(read(p))
const walk = (d) => readdirSync(d).flatMap((n) => (n === '.git' || n === 'node_modules' ? [] : statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]))

test('plugin manifest: name, version, author, homepage, repository, license and keywords', () => {
  const p = json('.claude-plugin/plugin.json')
  assert.equal(p.name, 'caelara')
  assert.match(p.version, /^\d+\.\d+\.\d+$/)
  assert.equal(p.version, '1.0.0')
  assert.deepEqual([p.author.name, p.author.email], ['Caelara Labs', 'ops@caelaralabs.com'])
  assert.equal(p.homepage, 'https://workbench.caelaralabs.com')
  assert.equal(p.repository, 'https://github.com/caelara-labs/claude-plugin')
  assert.equal(p.license, 'MIT')
  assert.deepEqual(p.keywords, ['mcp', 'security', 'prompt-injection', 'firewall', 'guardrails', 'ed25519', 'zero-retention'])
})

test('marketplace: caelara-labs lists the caelara plugin from the repository root, matching the manifest', () => {
  const m = json('.claude-plugin/marketplace.json')
  const p = json('.claude-plugin/plugin.json')
  assert.equal(m.name, 'caelara-labs')
  assert.ok(m.owner?.name)
  assert.equal(m.plugins.length, 1)
  assert.equal(m.plugins[0].name, p.name)
  assert.equal(m.plugins[0].source, './')
  assert.equal(m.plugins[0].version, p.version)
})

test('MCP servers: both run over stdio with npx and carry no key', () => {
  const s = json('.mcp.json').mcpServers
  assert.deepEqual(Object.keys(s).sort(), ['caelara-edge', 'caelara-shield'])
  assert.deepEqual(s['caelara-shield'].args, ['-y', '@caelaralabs/shield-mcp'])
  assert.deepEqual(s['caelara-edge'].args, ['-y', '@caelaralabs/mcp'])
  for (const v of Object.values(s)) { assert.equal(v.command, 'npx'); assert.equal(v.type, 'stdio'); assert.equal(v.env, undefined) }
})

const front = (text) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text)
  assert.ok(m, 'frontmatter')
  return Object.fromEntries(m[1].split('\n').map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]))
}

test('skills: three skills, each with a matching name and a description that says when to use it', () => {
  const names = readdirSync(join(root, 'skills')).sort()
  assert.deepEqual(names, ['offline-receipt-and-sandbox', 'pre-execution-firewall', 'scoped-subkey-and-hitl-guard'])
  for (const n of names) {
    const f = front(read(`skills/${n}/SKILL.md`))
    assert.equal(f.name, n)
    assert.ok(f.description.length > 60 && f.description.length < 1024, n)
    assert.match(f.description, /Use (when|whenever)/)
  }
})

test('commands: screen, sandbox and verify-receipt, each with a description and the arguments placeholder', () => {
  assert.deepEqual(readdirSync(join(root, 'commands')).sort(), ['sandbox.md', 'screen.md', 'verify-receipt.md'])
  for (const c of ['screen', 'sandbox', 'verify-receipt']) {
    const t = read(`commands/${c}.md`)
    assert.ok(front(t).description, c)
    assert.ok(t.includes('$ARGUMENTS'), c)
  }
})

test('keys are never hardcoded and are always passed from the environment', () => {
  for (const f of walk(root).filter((p) => !/[\\/]test[\\/]/.test(p))) {
    const t = readFileSync(f, 'utf8')
    assert.doesNotMatch(t, /ck_(live|trial|edge|pass)_[A-Za-z0-9]{8,}/, f)
    for (const line of t.split('\n').filter((l) => l.includes('X-Caelara-Key:'))) assert.match(line, /X-Caelara-Key: \$[A-Z_]+/, `${f}: ${line}`)
  }
})

test('README and docs: no money wording, no addresses, no personal links', () => {
  const docs = ['README.md', ...['pre-execution-firewall', 'scoped-subkey-and-hitl-guard', 'offline-receipt-and-sandbox'].map((s) => `skills/${s}/SKILL.md`), 'commands/screen.md', 'commands/sandbox.md', 'commands/verify-receipt.md']
  for (const d of docs) {
    const t = read(d)
    assert.doesNotMatch(t, /\$\d|\bUSDC\b|\bx402\b|\bprices?\b|\bpricing\b|\bprepaid\b|\bsubscription|\bbilling\b|\bcredits?\b|\bfree\b/i, d)
    assert.doesNotMatch(t, /0x[0-9a-fA-F]{40}/, d)
    assert.doesNotMatch(t, /github\.com\/(?!caelara-labs\/)[A-Za-z0-9-]+/, d)
    assert.doesNotMatch(t, /esc\x72ow|\biphone\b|\bipad\b|\bios\b/i, d)
  }
})

test('banned tokens and attribution: no endpoint counts, retired names, swap wording or authorship credit in any shipped file', () => {
  const banned = [
    /\b\d+\s+(endpoints|apis|skills)\b/i,
    new RegExp(['ops', 'jarvis'].join(''), 'i'),
    /\bswaps?\b|\bdex\b/i,
    new RegExp(['anthr', 'opic'].join(''), 'i'),
    new RegExp(['co-', 'authored-by'].join(''), 'i'),
    /generated (with|by)|written by (an )?ai|ai-generated/i,
    /not a cloud|cloud provider/i,
  ]
  for (const f of walk(root).filter((p) => !/[\\/]test[\\/]/.test(p))) {
    const t = readFileSync(f, 'utf8')
    for (const re of banned) assert.doesNotMatch(t, re, f)
  }
})

test('skills name only tools the caelara-shield server really exposes', () => {
  const real = new Set(['shield_preflight', 'shield_scan_prompt', 'shield_validate_output', 'shield_proxy_fetch', 'shield_audit_token', 'shield_check_expenditure'])
  for (const f of ['skills/pre-execution-firewall/SKILL.md', 'commands/screen.md']) {
    for (const name of read(f).match(/\bshield_[a-z_]+/g) ?? []) assert.ok(real.has(name), `${f}: ${name}`)
  }
})

test('README: two-command install and the live Canary Trap step', () => {
  const r = read('README.md')
  assert.ok(r.includes('/plugin marketplace add caelara-labs/claude-plugin') && r.includes('/plugin install caelara@caelara-labs'))
  assert.ok(r.includes('https://caelaralabs.com/shield/canary-trap/'))
})

test('offline verifier: the bundled receipt verifies, tampering is rejected, and the script runs with no network', () => {
  assert.equal(verifyReceipt(sampleReceipt(), pinnedKeys()).valid, true)
  assert.equal(verifyReceipt(tamper(sampleReceipt()), pinnedKeys()).valid, false)
  const out = execFileSync(process.execPath, [join(root, 'examples', 'verify-receipt-offline.mjs')], { encoding: 'utf8' })
  assert.match(out, /signature: VALID/)
  assert.ok(existsSync(join(root, 'LICENSE')) && read('LICENSE').startsWith('MIT License'))
})
