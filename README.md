# dsh-prompt-drift

System-prompt surface drift gate for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh).

Any plugin or preset can contribute sections to the assembled system prompt.
Upgrading one can silently rewrite what the model is **told**; a malicious
one can inject "ignore all safety rules" straight into the prompt. This
plugin hooks the `system-prompt/assemble` waterfall, hashes every section
(name → sha256(text)), baselines the surface, and diffs every later
assembly against it. **dsh-mcp-test guards what the model can call; this
guards what the model is told.** Zero LLM calls in the trust path.

## Why now (checked 2026-10-12)

Empty lane. The nearest neighbour (`dsh-modelprint`, 0★) fingerprints model
config, not the prompt surface. Prompt-injection plugins scan *content
flowing in*; nobody watches the assembled prompt itself — the one channel
every plugin can write to without anyone reviewing a diff.

## How it works

```
system-prompt/assemble ──> sections [{name, sha256(text)}] name-sorted
                     ──> baseline absent? freeze it (commit the file)
                     ──> diff: added / removed / changed sections
                     ──> warn once per distinct drift (signature dedup)
```

Dynamic sections (cwd, timestamps) can be excluded via `ignoreSections`.
Baseline file is stable, name-sorted JSON — commit it; it is the contract.

## Install

```sh
dsh plugin --profile default add github:zhengqiuyang/dsh-prompt-drift
```

Prebuilt `lib/` ships in the repo — git installs need no build step and no
`allowBuilds` authorization.

## Configure

```yaml
- id: dsh-prompt-drift
  name: dsh-prompt-drift
  config:
    baselinePath: .dsh-prompt-drift/baseline.json
    rebaselineOnDrift: false
    ignoreSections: []
```

## Develop

```sh
npm install && npm test
```

## Kill criteria

If dsh ships first-party prompt-surface pinning, this freezes at its last
working version with a postmortem here.
