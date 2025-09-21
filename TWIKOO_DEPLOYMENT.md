# Twikoo 评论系统部署指南

## 概述

本指南详细说明如何将 Twikoo 评论系统部署到 BloodMoney Games 网站，替代现有的基于 GitHub API 的评论系统。

## 目录

1. [准备工作](#准备工作)
2. [后端部署（Cloudflare Worker）](#后端部署)
3. [前端集成](#前端集成)
4. [测试验证](#测试验证)
5. [生产环境迁移](#生产环境迁移)
6. [故障排除](#故障排除)

## 准备工作

### 系统要求

- Node.js 16+ 和 npm
- Cloudflare 账号
- Wrangler CLI（Cloudflare 的命令行工具）

### 安装 Wrangler

```bash
npm install -g wrangler
```

### 登录 Cloudflare

```bash
wrangler login
```

## 后端部署

### 1. 进入 Twikoo 部署目录

```bash
cd twikoo-deploy
```

### 2. 安装依赖

```bash
# 如果 npm install 遇到问题，可以尝试：
npm install --cache /tmp/npm-cache
# 或者清理缓存后重试
rm -rf node_modules package-lock.json
npm install
```

### 3. 创建 D1 数据库

```bash
npx wrangler d1 create twikoo-bloodmoney
```

输出示例：
```
✅ Successfully created DB twikoo-bloodmoney
[[d1_databases]]
binding = "DB"
database_name = "twikoo-bloodmoney"
database_id = "abc123def456..."
```

### 4. 更新 wrangler.toml

将上一步获得的 `database_id` 更新到 `wrangler.toml` 文件：

```toml
[[d1_databases]]
binding = "DB"
database_name = "twikoo-bloodmoney"
database_id = "abc123def456..."  # 替换为实际的 ID
```

### 5. 初始化数据库

```bash
npx wrangler d1 execute twikoo-bloodmoney --remote --file=./schema.sql
```

### 6. 创建 R2 存储桶（用于图片上传）

```bash
npx wrangler r2 bucket create twikoo-bloodmoney
```

### 7. 更新 R2 配置

在 `wrangler.toml` 中更新 R2 公开 URL：

```toml
[vars]
R2_PUBLIC_URL = "https://pub-YOUR_ACCOUNT_ID.r2.dev"  # 替换为实际的 R2 URL
```

### 8. 部署 Worker

```bash
npx wrangler deploy --minify
```

成功后会显示 Worker URL，例如：
```
https://twikoo-bloodmoney.YOUR_USERNAME.workers.dev
```

### 9. 配置管理员密码

首次访问 `https://twikoo-bloodmoney.YOUR_USERNAME.workers.dev` 并设置管理员密码。

## 前端集成

### 方案 A：使用集成脚本（推荐）

1. **更新 Worker URL**

编辑 `rs/js/twikoo-init.js`，将 Worker URL 替换为实际部署的 URL：

```javascript
envId: 'https://twikoo-bloodmoney.YOUR_USERNAME.workers.dev',
// 替换为：
envId: 'https://twikoo-bloodmoney.实际用户名.workers.dev',
```

2. **更新游戏页面**

在每个游戏页面（如 `index.html`、`BloodMoney2.html` 等）进行以下修改：

**在 `<head>` 部分添加：**
```html
<!-- Twikoo CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/twikoo@1.6.39/dist/twikoo.css">
```

**替换评论容器：**
```html
<!-- 原来的 -->
<div id="comments-container">
    <!-- Comments will be loaded here by JavaScript -->
</div>

<!-- 替换为 -->
<div id="tcomment"></div>
```

**在页面底部添加脚本：**
```html
<!-- 移除原有评论系统脚本 -->
<!-- 
<script src="rs/js/security.js"></script>
<script src="rs/js/github-api.js"></script>
<script src="rs/js/comments.js"></script>
-->

<!-- 添加 Twikoo 脚本 -->
<script src="https://cdn.jsdelivr.net/npm/twikoo@1.6.39/dist/twikoo.all.min.js"></script>
<script src="rs/js/twikoo-init.js"></script>
```

### 方案 B：直接内联初始化

如果只想在特定页面测试，可以直接在页面中添加：

```html
<script>
twikoo.init({
    envId: 'https://twikoo-bloodmoney.实际用户名.workers.dev',
    el: '#tcomment',
    lang: 'en-US',
    path: window.location.pathname,
});
</script>
```

## 测试验证

### 1. 本地测试

访问 `test-twikoo.html` 页面进行基础功能测试：

```bash
# 如果有本地服务器
python3 -m http.server 8000
# 然后访问 http://localhost:8000/test-twikoo.html
```

### 2. 测试清单

- [ ] 评论表单正常显示
- [ ] 可以提交评论
- [ ] 评论正确显示
- [ ] 回复功能正常
- [ ] 表情选择器工作
- [ ] 图片上传功能（如果启用）
- [ ] 分页功能（评论数 > 10）
- [ ] 访客统计显示

### 3. 管理后台测试

访问评论区域，点击管理按钮，输入管理员密码进入后台：

- [ ] 可以查看所有评论
- [ ] 可以删除/审核评论
- [ ] 可以配置系统设置
- [ ] 可以查看统计数据

## 生产环境迁移

### 第一阶段：小范围测试（1-2 天）

1. 选择访问量较小的页面（如 `italian-brainrot-clicker.html`）
2. 按照前端集成步骤更新页面
3. 监控用户反馈和系统性能

### 第二阶段：扩大范围（3-5 天）

1. 更新 3-4 个中等流量的游戏页面
2. 收集用户体验反馈
3. 优化配置和样式

### 第三阶段：全面迁移（1 周）

1. 更新所有游戏页面
2. 保留旧评论系统代码作为备份
3. 更新文档和维护指南

### 历史数据迁移（可选）

如果需要保留历史评论，可以编写脚本从 `data/comments.json` 导入到 Twikoo：

```javascript
// 示例迁移脚本结构
async function migrateComments() {
    const oldComments = await fetch('/data/comments.json').then(r => r.json());
    
    for (const [gameId, comments] of Object.entries(oldComments)) {
        for (const comment of comments) {
            // 转换为 Twikoo 格式并通过 API 导入
            await importToTwikoo({
                nick: comment.author,
                mail: comment.email,
                comment: comment.content,
                created: comment.timestamp,
                url: `/games/${gameId}`,
            });
        }
    }
}
```

## 故障排除

### 常见问题

#### 1. Worker 部署失败

**错误：** `Authentication required`
```bash
# 解决方案：重新登录
wrangler login
```

#### 2. 数据库创建失败

**错误：** `D1 database limit reached`
```bash
# 解决方案：删除未使用的数据库或升级计划
wrangler d1 list
wrangler d1 delete [DATABASE_ID]
```

#### 3. 评论不显示

**检查步骤：**
1. 浏览器控制台是否有错误
2. Worker URL 是否正确
3. CORS 设置是否允许您的域名
4. 数据库是否正确初始化

#### 4. 邮件通知不工作

需要配置邮件服务（SendGrid 或 MailChannels）：

```javascript
// 在 Worker 中配置
const mailConfig = {
    SENDER_EMAIL: 'noreply@bloodmoney.ink',
    SENDER_NAME: 'BloodMoney Comments',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
};
```

### 性能优化

1. **启用 CDN 缓存**
   - Twikoo 静态资源使用 CDN
   - Worker 响应设置适当的缓存头

2. **数据库索引**
   - 确保 D1 数据库有适当的索引
   - 定期清理垃圾评论

3. **限流设置**
   - 配置评论提交频率限制
   - 启用验证码（如需要）

## 维护和监控

### 日常维护

- 定期检查管理后台的垃圾评论
- 监控 Worker 的请求量和错误率
- 定期备份 D1 数据库

### 监控指标

在 Cloudflare Dashboard 中监控：
- Worker 请求数
- 错误率
- 响应时间
- D1 数据库查询性能

### 备份策略

```bash
# 导出数据库备份
wrangler d1 execute twikoo-bloodmoney --command="SELECT * FROM comments" > backup.json

# 定期自动备份（使用 cron job）
0 2 * * * wrangler d1 execute twikoo-bloodmoney --command="SELECT * FROM comments" > backup-$(date +\%Y\%m\%d).json
```

## 回滚方案

如果需要回滚到原系统：

1. 恢复原有的 HTML 代码
2. 重新启用评论系统脚本
3. 确保 GitHub API 配置正确

保留的备份文件：
- `rs/js/comments.js`（原评论系统）
- `rs/js/security.js`（安全模块）
- `rs/js/github-api.js`（GitHub API 集成）
- `rs/css/comments.css`（原样式）

## 支持和资源

- [Twikoo 官方文档](https://twikoo.js.org)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [项目 Issue 追踪](https://github.com/melooooooo/bloodmoneygame/issues)

## 更新日志

- 2025-09-10: 初始部署方案创建
- 待定: 第一阶段测试开始
- 待定: 全面迁移完成

---

**注意：** 在执行任何生产环境更改前，请确保有完整的备份和回滚方案。