# GitHub App Setup Guide for ai-cherry Organization

## 🔒 Security First Approach

This guide provides a secure, production-ready setup for GitHub integration using GitHub Apps instead of Personal Access Tokens (PATs).

## Why GitHub Apps?

GitHub Apps provide several security advantages over Personal Access Tokens:
- **Fine-grained permissions**: Only grant access to what's needed
- **Organization-level installation**: No personal account dependencies
- **Automatic token rotation**: Short-lived tokens (1 hour)
- **Audit logging**: Track all actions performed by the app
- **No user seat consumption**: Doesn't count against organization member limits

## Prerequisites

- Admin access to the `ai-cherry` GitHub organization
- Access to the workbench-ui repository
- OpenSSL or similar tool for generating private keys

## Step 1: Create a GitHub App

1. Navigate to your organization settings:
   ```
   https://github.com/organizations/ai-cherry/settings/apps
   ```

2. Click **"New GitHub App"**

3. Configure the app with these settings:

### Basic Information
```yaml
GitHub App name: AI Cherry Workbench
Homepage URL: https://github.com/ai-cherry/workbench-ui
Description: Secure GitHub integration for AI Cherry Workbench UI
```

### Webhook Configuration
```yaml
Webhook URL: https://your-domain.com/api/webhooks/github
Webhook secret: [Generate a random string and save it]
SSL verification: Enable
```

### Permissions

#### Repository Permissions
- **Actions**: Read
- **Administration**: Read
- **Checks**: Write
- **Code**: Read
- **Commit statuses**: Write
- **Contents**: Write
- **Deployments**: Write
- **Issues**: Write
- **Metadata**: Read (mandatory)
- **Pull requests**: Write
- **Webhooks**: Write

#### Organization Permissions
- **Members**: Read
- **Projects**: Read

### Subscribe to Events
- Branch protection rule
- Check run
- Check suite
- Commit comment
- Create
- Delete
- Deployment
- Deployment status
- Fork
- Issue comment
- Issues
- Pull request
- Pull request review
- Pull request review comment
- Push
- Release
- Repository
- Status
- Workflow dispatch
- Workflow run

### Where can this GitHub App be installed?
Select: **Only on this account** (ai-cherry organization)

4. Click **"Create GitHub App"**

## Step 2: Generate and Secure the Private Key

1. After creating the app, you'll be redirected to the app settings
2. Scroll down to **"Private keys"**
3. Click **"Generate a private key"**
4. A `.pem` file will download - **SAVE THIS SECURELY**

### Secure the Private Key

```bash
# Create a secure directory for GitHub App credentials
mkdir -p ~/.ssh/github-apps
chmod 700 ~/.ssh/github-apps

# Move and secure the private key
mv ~/Downloads/ai-cherry-workbench.*.pem ~/.ssh/github-apps/ai-cherry-workbench.pem
chmod 600 ~/.ssh/github-apps/ai-cherry-workbench.pem

# Verify the key
openssl rsa -in ~/.ssh/github-apps/ai-cherry-workbench.pem -check -noout
```

### Optional: Convert to Base64 (for environment variables)

```bash
# Convert PEM to base64 for environment variable storage
base64 -i ~/.ssh/github-apps/ai-cherry-workbench.pem -o ai-cherry-workbench.pem.b64

# To decode later:
# base64 -d -i ai-cherry-workbench.pem.b64 -o ai-cherry-workbench.pem
```

## Step 3: Install the App to Your Organization

1. Go to the app's public page:
   ```
   https://github.com/apps/ai-cherry-workbench
   ```

2. Click **"Install"**

3. Select the `ai-cherry` organization

4. Choose repository access:
   - **Recommended**: Select "Only select repositories" and choose:
     - `workbench-ui`
     - `sophia-intel-ai`
     - Any other repositories that need integration

5. Click **"Install"**

6. Note the **Installation ID** from the URL:
   ```
   https://github.com/organizations/ai-cherry/settings/installations/[INSTALLATION_ID]
   ```

## Step 4: Configure Environment Variables

Update your `.env.local` file with the GitHub App credentials:

```bash
# GitHub App Configuration (Production)
GITHUB_APP_ID=123456  # From app settings page
GITHUB_APP_INSTALLATION_ID=12345678  # From installation URL
GITHUB_APP_PRIVATE_KEY_PATH=~/.ssh/github-apps/ai-cherry-workbench.pem

# Optional: Use base64 encoded key instead of file path
# GITHUB_APP_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...

# Webhook secret (for validating webhooks)
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here

# Organization settings
GITHUB_ORG=ai-cherry
```

## Step 5: Implement OAuth Flow (Optional)

For user-specific actions, implement OAuth:

### 1. Update App Settings

In your GitHub App settings, add:
```yaml
Callback URL: https://your-domain.com/api/auth/github/callback
Request user authorization (OAuth) during installation: Enable
```

### 2. Generate Client Secret

1. In app settings, find **"Client secrets"**
2. Click **"Generate a new client secret"**
3. Save the secret securely

### 3. Add OAuth Configuration

```bash
# OAuth Configuration (in .env.local)
GITHUB_APP_CLIENT_ID=Iv23lixxxxxxxxxxxxx  # From app settings
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx  # Generated secret
GITHUB_OAUTH_CALLBACK_URL=https://your-domain.com/api/auth/github/callback
```

## Step 6: Implement Authentication in Code

### Using GitHub App Authentication (Server-to-Server)

```typescript
// src/lib/github-app.ts
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export function getGitHubAppClient() {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY_PATH 
      ? fs.readFileSync(process.env.GITHUB_APP_PRIVATE_KEY_PATH, 'utf8')
      : Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_BASE64!, 'base64').toString(),
    installationId: process.env.GITHUB_APP_INSTALLATION_ID!,
  });

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY_PATH 
        ? fs.readFileSync(process.env.GITHUB_APP_PRIVATE_KEY_PATH, 'utf8')
        : Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_BASE64!, 'base64').toString(),
      installationId: process.env.GITHUB_APP_INSTALLATION_ID!,
    },
  });
}
```

### Using OAuth (User Authentication)

```typescript
// src/lib/github-oauth.ts
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";

export function getOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_APP_CLIENT_ID!,
    redirect_uri: process.env.GITHUB_OAUTH_CALLBACK_URL!,
    scope: 'repo read:user',
    state,
  });
  
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string) {
  const auth = createOAuthAppAuth({
    clientType: "oauth-app",
    clientId: process.env.GITHUB_APP_CLIENT_ID!,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
  });

  const { token } = await auth({
    type: "oauth-user",
    code,
  });

  return token;
}
```

## Step 7: Webhook Handler Implementation

```typescript
// src/app/api/webhooks/github/route.ts
import crypto from 'crypto';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  
  // Verify webhook signature
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')}`;
    
  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const payload = JSON.parse(body);
  const event = req.headers.get('x-github-event');
  
  // Handle different webhook events
  switch (event) {
    case 'push':
      await handlePushEvent(payload);
      break;
    case 'pull_request':
      await handlePullRequestEvent(payload);
      break;
    // Add more event handlers as needed
  }
  
  return new Response('OK', { status: 200 });
}
```

## Security Best Practices

### 1. Private Key Management
- **Never** commit private keys to version control
- Store keys in secure locations with restricted permissions
- Use key management services in production (AWS KMS, Azure Key Vault, etc.)
- Rotate keys regularly (every 90 days)

### 2. Token Security
- Use short-lived installation access tokens (1 hour expiry)
- Implement token refresh logic
- Never log or expose tokens
- Use environment variables, never hardcode

### 3. Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement rate limiting
- Log webhook events for auditing

### 4. Permission Principle
- Grant minimum required permissions
- Review permissions quarterly
- Remove unused permissions
- Monitor API usage

### 5. Monitoring & Auditing
- Enable GitHub audit logs
- Monitor API rate limits
- Track failed authentication attempts
- Set up alerts for suspicious activity

## Troubleshooting

### Common Issues

1. **"Bad credentials" error**
   - Verify App ID and Installation ID
   - Check private key format and permissions
   - Ensure the app is installed on the repository

2. **"Resource not accessible by integration"**
   - Check app permissions
   - Verify repository access
   - Ensure installation is active

3. **Webhook signature validation fails**
   - Verify webhook secret matches
   - Check signature algorithm (should be sha256)
   - Ensure body is raw, not parsed

### Debug Commands

```bash
# Test GitHub App authentication
curl -i -H "Authorization: Bearer YOUR_JWT" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/app

# List installations
curl -i -H "Authorization: Bearer YOUR_JWT" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/app/installations

# Get installation access token
curl -i -X POST \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/app/installations/INSTALLATION_ID/access_tokens
```

## Migration from Personal Access Tokens

If migrating from PATs to GitHub Apps:

1. **Parallel Run**: Run both authentication methods temporarily
2. **Update Code**: Gradually update code to use App authentication
3. **Test Thoroughly**: Ensure all features work with App auth
4. **Revoke PATs**: Once confirmed, revoke all PATs
5. **Update Documentation**: Ensure team knows about the change

## Support and Resources

- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [Octokit Documentation](https://octokit.github.io/rest.js)
- [GitHub API Reference](https://docs.github.com/en/rest)
- [Security Best Practices](https://docs.github.com/en/code-security)

## Emergency Procedures

### If Private Key is Compromised

1. **Immediately** generate a new private key in GitHub App settings
2. Delete the compromised key from GitHub
3. Update all systems with the new key
4. Audit recent API activity for unauthorized access
5. Notify security team

### If Suspicious Activity Detected

1. Review GitHub audit logs
2. Temporarily suspend the app if needed
3. Rotate all credentials
4. Review and restrict permissions
5. Enable additional monitoring

---

**Last Updated**: November 2024
**Maintained By**: AI Cherry Security Team
**Review Schedule**: Quarterly