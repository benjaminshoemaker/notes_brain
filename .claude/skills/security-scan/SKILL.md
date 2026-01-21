---
name: security-scan
description: Scan for security vulnerabilities in dependencies, code patterns, and secrets. Detects tech stack automatically and runs appropriate tools.
---

# Security Scan Skill

Scan the codebase for security vulnerabilities across three categories:
1. **Dependency vulnerabilities** — Known CVEs in packages
2. **Static analysis** — Insecure code patterns (OWASP Top 10)
3. **Secrets detection** — API keys, passwords, tokens in code

## When This Skill Runs

- Automatically during `/phase-checkpoint`
- On-demand via `/security-scan`
- Optionally during `/verify-task` for security-critical tasks

## Workflow Overview

```
1. Detect tech stack from project files
2. Run dependency audit (if applicable)
3. Run secrets detection
4. Run static analysis checks
5. Aggregate and deduplicate findings
6. Present issues with severity and fix suggestions
7. Offer to auto-fix where possible
```

## Step 1: Tech Stack Detection

Check for these files to determine which tools to run:

| File | Tech Stack | Dependency Tool |
|------|------------|-----------------|
| `package.json` | Node.js | `npm audit` or `yarn audit` or `pnpm audit` |
| `package-lock.json` | Node.js (npm) | `npm audit --json` |
| `yarn.lock` | Node.js (yarn) | `yarn audit --json` |
| `pnpm-lock.yaml` | Node.js (pnpm) | `pnpm audit --json` |
| `requirements.txt` or `pyproject.toml` | Python | `pip-audit --format=json` (if installed) |
| `Cargo.toml` | Rust | `cargo audit --json` (if installed) |
| `go.mod` | Go | `govulncheck ./...` (if installed) |
| `Gemfile.lock` | Ruby | `bundle audit check --format=json` (if installed) |

If a tool is not installed, note it and continue with other checks.

## Step 2: Dependency Audit

Run the appropriate dependency scanner based on detected tech stack.

### Node.js (npm)

```bash
npm audit --json 2>/dev/null
```

Parse the JSON output. Key fields:
- `vulnerabilities` object with package names as keys
- Each vulnerability has `severity` (critical, high, moderate, low)
- `fixAvailable` indicates if `npm audit fix` can resolve it

### Node.js (yarn)

```bash
yarn audit --json 2>/dev/null
```

### Node.js (pnpm)

```bash
pnpm audit --json 2>/dev/null
```

### Python

```bash
pip-audit --format=json 2>/dev/null
```

If pip-audit is not installed, note: "pip-audit not installed. Run `pip install pip-audit` to enable Python dependency scanning."

### Rust

```bash
cargo audit --json 2>/dev/null
```

### Go

```bash
govulncheck -json ./... 2>/dev/null
```

## Step 3: Secrets Detection

Scan for hardcoded secrets using pattern matching. This runs regardless of tech stack.

### Patterns to Detect

| Pattern | Regex | Severity |
|---------|-------|----------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | CRITICAL |
| AWS Secret Key | `(?i)aws_secret_access_key\s*=\s*['"][^'"]+['"]` | CRITICAL |
| GitHub Token | `ghp_[a-zA-Z0-9]{36}` | CRITICAL |
| GitHub Token (old) | `github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}` | CRITICAL |
| Generic API Key | `(?i)(api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]` | HIGH |
| Generic Secret | `(?i)(secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]` | HIGH |
| Private Key | `-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----` | CRITICAL |
| JWT Token | `eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*` | HIGH |
| Slack Token | `xox[baprs]-[0-9a-zA-Z]{10,48}` | HIGH |
| Stripe Key | `sk_live_[0-9a-zA-Z]{24}` | CRITICAL |

### Directories to Skip

- `node_modules/`
- `.git/`
- `vendor/`
- `venv/`, `.venv/`, `env/`
- `dist/`, `build/`
- `*.min.js`, `*.bundle.js`
- Binary files

### Implementation

Use Grep tool with each pattern, excluding skip directories:

```bash
# Example for AWS Access Key
grep -rE "AKIA[0-9A-Z]{16}" --include="*.{js,ts,py,go,rb,java,json,yaml,yml,env,sh}" \
  --exclude-dir={node_modules,.git,vendor,venv,dist,build} .
```

## Step 4: Static Analysis (Code Patterns)

Check for common insecure code patterns. These are language-aware.

### JavaScript/TypeScript

| Issue | Pattern | Severity |
|-------|---------|----------|
| eval() usage | `eval\s*\(` | HIGH |
| innerHTML assignment | `\.innerHTML\s*=` | MEDIUM |
| document.write | `document\.write\s*\(` | MEDIUM |
| Unvalidated redirect | `window\.location\s*=.*\+` | MEDIUM |
| SQL string concatenation | `(?i)(SELECT|INSERT|UPDATE|DELETE).*\+.*(?:req\.|request\.|params\.)` | HIGH |

### Python

| Issue | Pattern | Severity |
|-------|---------|----------|
| eval() usage | `eval\s*\(` | HIGH |
| exec() usage | `exec\s*\(` | HIGH |
| Shell injection | `subprocess\.(call|run|Popen).*shell\s*=\s*True` | HIGH |
| SQL string formatting | `execute\s*\(\s*f['"]` or `execute\s*\(\s*['"].*%` | HIGH |
| Pickle untrusted data | `pickle\.loads?\s*\(` | MEDIUM |

### General (All Languages)

| Issue | Pattern | Severity |
|-------|---------|----------|
| TODO security | `(?i)TODO.*security` | LOW |
| FIXME security | `(?i)FIXME.*security` | MEDIUM |
| Disabled SSL verification | `(?i)(verify\s*=\s*False|ssl_verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED)` | HIGH |
| Hardcoded localhost in prod | Check if non-test files reference `localhost` or `127.0.0.1` for API URLs | LOW |

## Step 5: Aggregate Findings

Collect all findings into a unified format:

```
SECURITY SCAN RESULTS
=====================

Scanned: 2025-01-08
Tech Stack: Node.js (npm)
Checks Run: Dependencies, Secrets, Static Analysis

CRITICAL (2)
------------
[DEP-001] lodash@4.17.20 — Prototype Pollution (CVE-2021-23337)
  Fix: npm audit fix --force

[SEC-001] Hardcoded API key in src/config.ts:15
  Text: const API_KEY = "sk_live_abc123..."
  Fix: Move to environment variable

HIGH (1)
--------
[SAST-001] SQL string concatenation in src/db/users.ts:42
  Text: db.query(`SELECT * FROM users WHERE id = ${userId}`)
  Fix: Use parameterized queries

MEDIUM (0)
----------
None

LOW (1)
-------
[SAST-002] TODO security comment in src/auth.ts:78
  Text: // TODO: add rate limiting for security
  Fix: Address or remove TODO

Summary: 2 critical, 1 high, 0 medium, 1 low
```

## Step 6: Present Issues

For CRITICAL and HIGH issues, present interactively:

```
ISSUE 1 of 3: [DEP-001] Dependency Vulnerability
------------------------------------------------
Package: lodash@4.17.20
Vulnerability: Prototype Pollution (CVE-2021-23337)
Severity: CRITICAL
CVSS: 7.4

How would you like to resolve this?
```

Use AskUserQuestion with options:

**For dependency vulnerabilities:**
- Option 1: Run `npm audit fix` (if fixAvailable)
- Option 2: Run `npm audit fix --force` (may have breaking changes)
- Option 3: Add to ignore list (document accepted risk)
- Option 4: Skip for now

**For secrets:**
- Option 1: Remove and add to .env (will show example)
- Option 2: This is a false positive (test data, example)
- Option 3: Skip for now

**For code patterns:**
- Option 1: Show secure alternative (provide fix)
- Option 2: This is intentional (document reason)
- Option 3: Skip for now

## Step 7: Apply Fixes

Based on user choices:

### Dependency fixes
```bash
npm audit fix
# or
npm audit fix --force
```

### Secret removal
1. Create or update `.env` file with the secret
2. Replace hardcoded value with `process.env.SECRET_NAME`
3. Add `.env` to `.gitignore` if not present
4. Create `.env.example` with placeholder

### Code pattern fixes
Use Edit tool to replace insecure pattern with secure alternative.

## Output Format

### When called from /phase-checkpoint

Return a structured result:

```
Security Scan: PASSED | FAILED | PASSED WITH NOTES

Issues: X critical, Y high, Z medium
Fixed: N issues
Skipped: M issues (documented)

Blocking: Yes/No
```

### When called standalone

Show full report with all findings and options.

## Severity Definitions

| Severity | Meaning | Action |
|----------|---------|--------|
| CRITICAL | Exploitable vulnerability, exposed secrets | BLOCKS checkpoint |
| HIGH | Significant security risk | BLOCKS checkpoint |
| MEDIUM | Should be addressed | Note, doesn't block |
| LOW | Minor issue or informational | Note only |

## Configuration

The skill respects a `.security-scan-ignore` file if present:

```
# Ignore specific CVEs (with reason)
CVE-2021-23337  # lodash - not exploitable in our usage

# Ignore specific files for secrets detection
test/fixtures/mock-credentials.json  # test data only

# Ignore specific patterns
src/examples/*.ts  # example code, not production
```

## Tool Installation Notes

If required tools are missing, provide installation instructions:

```
Some security tools are not installed:

pip-audit (Python): pip install pip-audit
cargo-audit (Rust): cargo install cargo-audit
govulncheck (Go): go install golang.org/x/vuln/cmd/govulncheck@latest

Install these for comprehensive scanning, or continue with available tools.
```

## Example Invocations

```bash
/security-scan              # Full scan
/security-scan --deps       # Dependencies only
/security-scan --secrets    # Secrets detection only
/security-scan --code       # Static analysis only
/security-scan --fix        # Auto-fix where possible
```
