# 🔑 GitHub API 配置完整指南

## 📋 配置清单

### ✅ 必需步骤
- [ ] 1. 创建 GitHub Personal Access Token
- [ ] 2. 配置本地开发环境
- [ ] 3. 设置 Cloudflare Pages 环境变量
- [ ] 4. 测试 API 连接
- [ ] 5. 验证评论系统功能

---

## 🎯 第一步：创建 GitHub Personal Access Token

### 1.1 访问 GitHub Token 设置页面
🔗 **链接**: https://github.com/settings/tokens

### 1.2 创建新 Token (推荐: Fine-grained tokens)
```
点击: "Generate new token" → "Generate new token (beta)"

配置项：
┌─────────────────────────────────────────┐
│ Token name: BloodMoney Comments System  │
│ Description: 用于BloodMoney评论系统     │
│ Expiration: 90 days (或自定义)          │
│ Resource owner: melooooooo              │
│ Repository access: Selected repositories│
│   └── 选择: bloodmoneygame              │
└─────────────────────────────────────────┘

Repository permissions:
✅ Contents: Write      (必需 - 修改comments.json)
✅ Metadata: Read       (必需 - 读取仓库信息)  
✅ Actions: Write       (可选 - 触发构建)
✅ Pull requests: Write (可选 - 未来功能)
```

### 1.3 复制并保存 Token
⚠️ **重要**: Token只显示一次，请立即复制保存！

格式示例: `ghp_1234567890abcdefghijklmnopqrstuvwxyz123456`

---

## 🛠️ 第二步：本地开发环境配置

### 2.1 使用配置页面（推荐）
1. 打开 `setup-github-token.html` 文件
2. 按照页面指引输入 GitHub Token
3. 测试连接并保存配置

### 2.2 手动配置 localStorage
在浏览器控制台中执行：
```javascript
// 设置 GitHub Token
localStorage.setItem('github_token', 'your_github_token_here');

// 设置仓库信息
localStorage.setItem('github_owner', 'melooooooo');
localStorage.setItem('github_repo', 'bloodmoneygame');
localStorage.setItem('github_branch', 'main');

// 验证配置
console.log('GitHub配置:', {
    token: localStorage.getItem('github_token'),
    owner: localStorage.getItem('github_owner'),
    repo: localStorage.getItem('github_repo')
});
```

### 2.3 创建 .env 文件（可选）
```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=melooooooo
GITHUB_REPO=bloodmoneygame
GITHUB_BRANCH=main
```

---

## ☁️ 第三步：Cloudflare Pages 配置

### 3.1 登录 Cloudflare Dashboard
🔗 **链接**: https://dash.cloudflare.com

### 3.2 进入 Pages 项目设置
```
导航路径：
Cloudflare Dashboard → Pages → bloodmoneygame → Settings
```

### 3.3 添加环境变量
在 **Environment variables** 部分添加：

| 变量名 | 值 | 环境 |
|--------|----|----- |
| `GITHUB_TOKEN` | `ghp_your_token_here` | Production + Preview |
| `GITHUB_OWNER` | `melooooooo` | Production + Preview |
| `GITHUB_REPO` | `bloodmoneygame` | Production + Preview |  
| `GITHUB_BRANCH` | `main` | Production + Preview |

### 3.4 配置构建命令
```bash
# Build command (如果使用构建脚本)
npm run build

# Output directory
./

# Root directory  
./
```

---

## 🧪 第四步：测试 API 连接

### 4.1 基础连接测试
```javascript
// 在浏览器控制台中测试
async function testGitHubAPI() {
    const token = localStorage.getItem('github_token');
    
    const response = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (response.ok) {
        const userData = await response.json();
        console.log('✅ API连接成功:', userData.login);
    } else {
        console.error('❌ API连接失败:', response.status);
    }
}

testGitHubAPI();
```

### 4.2 仓库权限测试  
```javascript
async function testRepoAccess() {
    const token = localStorage.getItem('github_token');
    
    const response = await fetch('https://api.github.com/repos/melooooooo/bloodmoneygame', {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (response.ok) {
        const repoData = await response.json();
        console.log('✅ 仓库访问成功:', repoData.full_name);
        console.log('📝 写入权限:', repoData.permissions.push);
    } else {
        console.error('❌ 仓库访问失败:', response.status);
    }
}

testRepoAccess();
```

---

## ✅ 第五步：验证评论系统

### 5.1 检查配置加载
在游戏页面打开控制台，查看：
```javascript
// 检查配置管理器
console.log('配置管理器:', window.configManager);

// 检查GitHub Token
console.log('GitHub Token:', window.configManager?.get('github.token') ? '✅ 已设置' : '❌ 未设置');

// 检查评论系统
console.log('评论系统:', window.commentsSystem);
```

### 5.2 提交测试评论
1. 访问游戏页面（如 `index.html`）
2. 滚动到页面底部的评论区域
3. 填写测试评论并提交
4. 观察控制台输出和页面反馈

### 5.3 验证 GitHub 提交
1. 检查仓库的 `data/comments.json` 文件
2. 查看最近的 commits 历史
3. 等待 Cloudflare Pages 重新部署
4. 刷新页面验证新评论显示

---

## 🔒 安全最佳实践

### GitHub Token 安全
- ✅ **使用 Fine-grained tokens** 限制权限范围
- ✅ **设置较短的过期时间** (90天以内)
- ✅ **定期轮换 Token** 增强安全性
- ❌ **不要在代码中硬编码** Token
- ❌ **不要在截图中暴露** Token
- ❌ **不要提交到 Git 仓库** 中

### 仓库权限配置
```
最小权限原则：
✅ Contents: Write    - 修改评论文件
✅ Metadata: Read     - 读取仓库信息
❌ Admin: No         - 避免过高权限
❌ Issues: No        - 评论系统不需要
❌ Discussions: No   - 评论系统不需要
```

---

## 🐛 常见问题解决

### 问题 1: "API rate limit exceeded"
**原因**: GitHub API 请求频率过高
**解决**:
```javascript
// 检查当前限制状态
async function checkRateLimit() {
    const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
            'Authorization': `token ${your_token}`
        }
    });
    const data = await response.json();
    console.log('API限制状态:', data.rate);
}
```

### 问题 2: "Bad credentials"  
**原因**: Token无效或权限不足
**解决**:
1. 检查Token是否正确复制
2. 确认Token未过期
3. 验证仓库权限设置

### 问题 3: "Repository not found"
**原因**: 仓库名称错误或权限不足
**解决**:
1. 确认仓库名称: `melooooooo/bloodmoneygame`
2. 检查Token是否有该仓库的访问权限
3. 确认仓库不是私有的（或Token有私有仓库权限）

### 问题 4: 评论提交成功但不显示
**原因**: Cloudflare Pages未重新部署
**解决**:
1. 等待2-3分钟让Pages自动重新部署
2. 手动触发重新部署
3. 检查构建日志

---

## 📊 配置状态检查

### 开发环境检查清单
- [ ] `setup-github-token.html` 页面配置完成
- [ ] 浏览器localStorage中有GitHub Token
- [ ] API连接测试通过
- [ ] 仓库权限测试通过
- [ ] 评论系统加载正常

### 生产环境检查清单  
- [ ] Cloudflare Pages环境变量已设置
- [ ] 构建和部署成功
- [ ] 线上评论功能正常
- [ ] GitHub commits正常创建
- [ ] 页面自动更新评论

---

## 🔧 高级配置

### 自定义Token检测
```javascript
// 在config.js中添加自定义检测逻辑
getGitHubToken() {
    // 1. 优先使用window全局变量
    if (window.GITHUB_TOKEN) return window.GITHUB_TOKEN;
    
    // 2. 检查localStorage (开发环境)
    if (this.isDevelopment) {
        return localStorage.getItem('github_token');
    }
    
    // 3. 检查meta标签 (构建时注入)
    const meta = document.querySelector('meta[name="github-token"]');
    if (meta) return meta.getAttribute('content');
    
    // 4. 从API获取 (如果有服务端)
    // return await this.fetchTokenFromAPI();
    
    return null;
}
```

### 构建时注入配置
```bash
# 运行构建脚本
npm run build

# 检查生成的配置文件
cat rs/js/build-config.js
```

---

## 📞 获取帮助

### 文档资源
- [GitHub Token 文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [项目README](./COMMENTS_README.md)

### 调试工具
- `setup-github-token.html` - 配置和测试工具
- 浏览器开发者工具控制台
- GitHub API 响应信息

### 支持联系
- 项目Issues: GitHub仓库Issues页面
- 配置问题: 查看浏览器控制台错误
- API问题: 检查GitHub API文档

---

**配置完成后，你的评论系统就可以正常工作了！** 🎉

用户提交的评论将自动通过GitHub API保存到`data/comments.json`文件，然后触发Cloudflare Pages重新部署，1-3分钟后新评论就会显示在页面上。