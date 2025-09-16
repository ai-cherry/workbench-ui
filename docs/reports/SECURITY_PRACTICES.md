# Security Practices for AI Cherry Workbench

## 🎯 Quick Action Items

### Immediate Actions Required

1. **Simplified GitHub workflow (SSH preferred)**
   - Remote is SSH: `git@github.com:ai-cherry/workbench-ui.git`
   - Push with one command: `./scripts/git-sync.sh "feat: message"`
   - No PAT or GitHub App required for day-to-day pushes.

2. **Set up your local environment**
   ```bash
   # Run the setup script
   ./scripts/setup-github-access.sh
   
   # This will:
   # - Create a new GitHub PAT
   # - Configure .env.local
   # - Test the connection
   # - Set up MCP servers
   ```

3. **Local-only credentials**
   - Keep secrets in `.env.local` (gitignored) and `.roo/mcp.json` (now gitignored).
   - Do not commit these files. Keep them local.
   - Optional: use `scripts/setup-github-access.sh` if you choose to use a PAT for GitHub APIs.

## 🔐 Credential Management

### Environment Variables Structure

```bash
# .env.local (NEVER COMMIT THIS FILE)
├── Core API Keys
│   ├── ANTHROPIC_API_KEY
│   ├── OPENAI_API_KEY
│   └── PORTKEY_API_KEY
├── GitHub Integration
│   ├── GITHUB_PERSONAL_ACCESS_TOKEN (development)
│   ├── GITHUB_APP_ID (production)
│   └── GITHUB_APP_INSTALLATION_ID (production)
└── MCP Server Keys
    ├── APIFY_API_TOKEN
    ├── BRAVE_API_KEY
    └── EXA_API_KEY
```

### Quick Setup Commands

```bash
# Initial setup (interactive)
./scripts/setup-github-access.sh

# Manual token setup
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
echo "GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN" >> .env.local

# Test GitHub connection
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" https://api.github.com/user

# Test MCP servers
npm run mcp:connect
```

## 🚀 Simplified GitHub Access

### Option 1: SSH (Recommended for day-to-day)

No tokens required for git push/pull.

### Option 2: Personal Access Token (Quick Start)

**Best for**: Development, testing, quick prototypes

```bash
# Create token at: https://github.com/settings/tokens/new
# Required scopes:
- repo (full control)
- workflow (GitHub Actions)
- admin:org (if working with org repos)

# Add to .env.local:
GITHUB_PERSONAL_ACCESS_TOKEN=github_pat_YOUR_TOKEN_HERE
```

### Option 2: GitHub App (Production)

**Best for**: Production, team environments, automated workflows

```bash
# Quick setup:
1. Create app: https://github.com/settings/apps/new
2. Install on ai-cherry org
3. Add credentials to .env.local:
   GITHUB_APP_ID=123456
   GITHUB_APP_INSTALLATION_ID=12345678
   GITHUB_APP_PRIVATE_KEY_PATH=~/.ssh/github-app.pem
```

See [GitHub App Setup Guide](docs/GITHUB_APP_SETUP_GUIDE.md) for detailed instructions.

## 🛠️ MCP Server Configuration

### MCP Server Config (Local)

`.roo/mcp.json` is local-only (gitignored). It can reference env vars from `.env.local`:

```json
{
  "mcpServers": {
    "github": {
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "apify": {
      "env": {
        "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
      }
    },
    "brave-search": {
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    },
    "exa": {
      "env": {
        "EXA_API_KEY": "${EXA_API_KEY}"
      }
    }
  }
}
```

### Testing MCP Servers

```bash
# Test all MCP servers
./scripts/test-mcp-servers.sh

# Test individual server
npm run mcp:test -- github
npm run mcp:test -- memory
npm run mcp:test -- apify
```

## 🔑 SSH Key Management

### Current SSH Keys

```bash
# List SSH keys
ls -la ~/.ssh/

# Expected keys:
~/.ssh/id_ed25519          # Personal GitHub SSH key
~/.ssh/id_ed25519.pub      # Public key
~/.ssh/github-app.pem      # GitHub App private key (if using)
```

### SSH Configuration

```bash
# ~/.ssh/config
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

### Test SSH Connection

```bash
# Test GitHub SSH
ssh -T git@github.com

# Expected output:
# Hi username! You've successfully authenticated...
```

## 📊 Security Checklist

### Daily Practices
- [ ] Use `.env.local` and local `.roo/mcp.json` for all credentials
- [ ] Never hardcode tokens in code
- [ ] Check git status before committing
- [ ] Use environment variables in configs

### Weekly Review
- [ ] Review API usage logs
- [ ] Check for unusual GitHub activity
- [ ] Update dependencies (`npm audit`)
- [ ] Verify no credentials in commit history

### Monthly Tasks
- [ ] Rotate API keys if needed
- [ ] Review GitHub App permissions
- [ ] Audit repository access
- [ ] Update security documentation

### Backend/Frontend Security Toggles (Optional)

- Backend CORS origins: `ALLOWED_ORIGINS` (comma-separated), defaults to `http://localhost:3000,http://localhost:3001`
- Backend token TTL override: `ACCESS_TOKEN_EXPIRE_MINUTES` (overrides days) and `ACCESS_TOKEN_EXPIRE_DAYS` (default 7)
- Backend JWT claims (optional): `JWT_ISSUER`, `JWT_AUDIENCE`
- Backend MCP proxy restrictions: `RESTRICT_MCP_PROXY=true` to enable allowlist
- Backend safe command modes: `SAFE_COMMANDS_ONLY=true`, and leave `ALLOW_FULL_PRIVILEGE_COMMANDS` unset or false
- Frontend headers: `NEXT_PUBLIC_APP_URL` to set allowed origin; `NEXT_PUBLIC_BACKEND_URL` for Agents Dashboard

Keep these unset unless you specifically need them. Defaults are dev-friendly.
- [ ] Security audit of codebase
- [ ] Review and update .gitignore
- [ ] Team security training

## 🚨 Emergency Procedures

### If Credentials Are Exposed

1. **Immediately revoke the exposed credential**
   ```bash
   # GitHub PAT
   https://github.com/settings/tokens
   
   # API Keys
   Check respective service dashboards
   ```

2. **Generate new credentials**
   ```bash
   ./scripts/setup-github-access.sh
   ```

3. **Update all systems**
   ```bash
   # Update .env.local
   # Restart services
   npm run dev
   ```

4. **Audit for unauthorized access**
   - Check GitHub audit log
   - Review API usage
   - Check for unexpected commits

### Quick Recovery Commands

```bash
# Remove credentials from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push cleaned history (CAREFUL!)
git push origin --force --all
git push origin --force --tags
```

## 🔄 Automated Security

### GitHub Actions Secrets

Set these in your repository settings:

```yaml
# .github/workflows/ci.yml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Pre-commit Hooks

```bash
# Install pre-commit
npm install --save-dev husky

# Add hook to prevent credential commits
npx husky add .husky/pre-commit "grep -r 'sk-\|github_pat_\|api_key' --exclude-dir=.git ."
```

## 📚 Resources

### Quick Links
- [GitHub PAT Setup](https://github.com/settings/tokens/new)
- [GitHub App Creation](https://github.com/settings/apps/new)
- [Anthropic Console](https://console.anthropic.com/)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Portkey Dashboard](https://app.portkey.ai/)

### Documentation
- [GitHub App Setup Guide](docs/GITHUB_APP_SETUP_GUIDE.md)
- [MCP Servers Guide](MCP_SERVERS_GUIDE.md)
- [Quick Start Guide](QUICK_START.md)

### Support
- GitHub Issues: [ai-cherry/workbench-ui](https://github.com/ai-cherry/workbench-ui/issues)
- Security Concerns: security@ai-cherry.com

## ✅ Summary

1. **Credentials are now secure** - All tokens use environment variables
2. **`.env.local` is protected** - Added to .gitignore
3. **MCP servers configured** - Using environment variables
4. **Setup script available** - Run `./scripts/setup-github-access.sh`
5. **Documentation complete** - Guides for all scenarios

### Next Steps

```bash
# 1. Run the setup script
./scripts/setup-github-access.sh

# 2. Start development
npm run dev

# 3. Test MCP servers
npm run mcp:connect

# 4. Begin coding!
```

---

**Remember**: Security is everyone's responsibility. When in doubt, ask for help!

**Last Updated**: November 2024
**Version**: 1.0.0
