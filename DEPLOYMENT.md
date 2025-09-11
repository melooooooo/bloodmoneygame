# 🚀 BloodMoney Comments System - Cloudflare Deployment Guide

This guide will help you deploy the BloodMoney website with a secure comments system using Cloudflare Pages and Workers.

## 📋 Prerequisites

1. **GitHub Account** with repository `melooooooo/bloodmoneygame`
2. **Cloudflare Account** (free tier is sufficient)
3. **GitHub Personal Access Token** with `repo` permissions
4. **Node.js** installed locally (for building)

## 🏗️ Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│                 │         │                  │         │             │
│  Cloudflare     │ ──API──▶│  Cloudflare      │ ──API──▶│   GitHub    │
│  Pages          │         │  Worker          │         │   Repo      │
│  (Static Site)  │         │  (Secure API)    │         │   (Data)    │
│                 │         │                  │         │             │
└─────────────────┘         └──────────────────┘         └─────────────┘
```

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Configure:
   - **Note**: `BloodMoney Comments System`
   - **Expiration**: 90 days (or your preference)
   - **Scopes**: ✅ `repo` (Full control of private repositories)
4. Copy the token (starts with `ghp_`)
5. **Save it securely** - you'll need it for Step 3

## Step 2: Deploy Cloudflare Worker

### 2.1 Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2.2 Login to Cloudflare

```bash
wrangler login
```

### 2.3 Deploy the Worker

```bash
# From the project root directory
wrangler deploy
```

### 2.4 Set the GitHub Token Secret

```bash
wrangler secret put GITHUB_TOKEN
# Paste your GitHub token when prompted
```

### 2.5 Configure Worker Route (Optional)

If you want to use a custom domain:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker `bloodmoney-comments-api`
3. Go to Settings → Triggers
4. Add route: `bloodmoney.ink/api/*`

## Step 3: Deploy to Cloudflare Pages

### 3.1 Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click "Create a project"
3. Connect to Git → Select GitHub
4. Choose repository: `melooooooo/bloodmoneygame`

### 3.2 Configure Build Settings

```yaml
Build command: npm run build
Build output directory: /
Root directory: /
```

### 3.3 Set Environment Variables

Add these in the Cloudflare Pages settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `GITHUB_OWNER` | `melooooooo` | GitHub username |
| `GITHUB_REPO` | `bloodmoneygame` | Repository name |
| `GITHUB_BRANCH` | `main` | Branch name |
| `WORKER_URL` | `https://bloodmoney.ink/api` | Your Worker URL |
| `NODE_VERSION` | `18` | Node.js version |

### 3.4 Deploy

Click "Save and Deploy"

## Step 4: Verify Deployment

### 4.1 Check Worker Health

```bash
curl https://bloodmoney.ink/api/health
# Should return: {"status":"healthy"}
```

### 4.2 Test Comments Loading

Visit your site and check browser console:
- Comments should load from `data/comments.json`
- No errors in console

### 4.3 Test Comment Submission

1. Fill out the comment form
2. Submit a comment
3. Check GitHub repository for new commit
4. Wait 1-2 minutes for Cloudflare Pages to rebuild
5. Refresh page to see new comment

## 🔧 Local Development

### Run Worker Locally

```bash
wrangler dev
# Worker will be available at http://localhost:8787
```

### Update Frontend Config for Local Development

Edit `rs/js/config.js`:

```javascript
api: {
    workerUrl: 'http://localhost:8787/api', // Local worker
}
```

## 🐛 Troubleshooting

### Issue: Comments not loading

**Check:**
1. Worker is deployed: `wrangler tail` to see logs
2. CORS headers are correct
3. `data/comments.json` exists in repository

### Issue: Cannot submit comments

**Check:**
1. GitHub token is set: `wrangler secret list`
2. Token has correct permissions
3. Rate limiting (1 minute between comments)

### Issue: 404 on API calls

**Check:**
1. Worker route is configured correctly
2. Domain is proxied through Cloudflare (orange cloud)

### Issue: Build fails on Cloudflare Pages

**Check:**
1. Node version is set to 18
2. Build command is correct
3. Environment variables are set

## 🔒 Security Best Practices

1. **Never commit GitHub token** to repository
2. **Use environment variables** for sensitive data
3. **Enable rate limiting** in Worker (already configured)
4. **Validate all input** before processing
5. **Keep token permissions minimal** (only `repo` scope needed)

## 📊 Monitoring

### View Worker Analytics

1. Cloudflare Dashboard → Workers & Pages
2. Select `bloodmoney-comments-api`
3. View metrics and logs

### View Pages Analytics

1. Cloudflare Dashboard → Pages
2. Select your project
3. View deployments and analytics

## 🔄 Updates and Maintenance

### Update Worker Code

```bash
# Make changes to workers/comments-api.js
wrangler deploy
```

### Rotate GitHub Token

1. Create new token on GitHub
2. Update in Cloudflare:
```bash
wrangler secret put GITHUB_TOKEN
```
3. Delete old token on GitHub

### Update Site Content

Just push to GitHub - Cloudflare Pages will auto-deploy!

## 📝 Configuration Files Reference

### `wrangler.toml`
- Worker configuration
- Routes and environment settings

### `workers/comments-api.js`
- API endpoint handlers
- GitHub integration logic
- Security validations

### `rs/js/config.js`
- Frontend configuration
- API endpoints
- Feature flags

### `build-config.js`
- Build-time configuration
- Environment variable injection

## 🆘 Support

If you encounter issues:

1. Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
2. Check the [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/)
3. Review Worker logs: `wrangler tail`
4. Check GitHub API status: https://www.githubstatus.com/

## ✅ Deployment Checklist

- [ ] GitHub token created with `repo` permissions
- [ ] Cloudflare Worker deployed
- [ ] GitHub token added as Worker secret
- [ ] Cloudflare Pages connected to GitHub repo
- [ ] Environment variables configured in Pages
- [ ] Worker route configured (if using custom domain)
- [ ] Comments loading successfully
- [ ] Comment submission working
- [ ] Rate limiting active
- [ ] CORS configured correctly

---

**🎉 Congratulations!** Your BloodMoney site with secure comments system is now deployed!