Codex CLI Integration

This repository integrates the Codex CLI to automate pull request reviews and enable local agent workflows.

Prerequisites (Apple Silicon / M‑series)
- Install Codex CLI
  - Homebrew: `arch -arm64 brew install codex-cli`
  - If previously installed under Rosetta: `arch -arm64 brew uninstall codex-cli && arch -arm64 brew install codex-cli`
  - npm (alternative): `arch -arm64 npm install -g @codex/cli`
- Verify binary architecture
  - `file $(which codex)` → should report `arm64`
  - If not found and using Homebrew, ensure PATH includes the Apple Silicon prefix:
    - `echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile && source ~/.zprofile`
- Authenticate
  - `echo 'export CODEX_API_KEY="sk-xxxxx"' >> ~/.zshrc && source ~/.zshrc`

Optional: Local config aliases
- Create `~/.codexrc.yml` with:

  default_model: gpt-5-codex
  aliases:
    g5c: gpt-5-codex
    g5: gpt-5
    g4: gpt-4
    codex: gpt-5-codex

- A repo example is available at `.codexrc.yml.example`.

Usage
- Quick chat: `codex chat --model gpt-5-codex`
- One‑shot: `codex run "Generate a FastAPI SSE route" --model gpt-5-codex`
- Agent in this repo: `codex agent --model gpt-5-codex --dir .`
- If using npm scripts added here:
  - `npm run codex:chat`
  - `npm run codex:agent`

GitHub PR Reviews
- Workflow file: `.github/workflows/codex-review.yml`
- Requirement: Add repo secret `CODEX_API_KEY` (GitHub → Settings → Secrets and variables → Actions → New repository secret)
- On pull requests, the workflow:
  - Installs Codex CLI
  - Runs `codex review --model gpt-5-codex --format markdown` to generate `codex-review.md`
  - Posts the review as a PR comment

Troubleshooting
- Rosetta contamination: `ps -o arch= -p $(pgrep -f codex)` should show `arm64`; if `i386`, reinstall via `arch -arm64`.
- Node path (for npm installs): `arch -arm64 node -v` should use an ARM64 Node; if not, reinstall Node with nvm or Homebrew under ARM64.
