# 🗨️ Twikoo 评论系统配置指南

## 概述

您的网站现在使用 Twikoo 作为评论系统。Twikoo 是一个简洁、安全、免费的静态网站评论系统。

## 🎨 界面优化已完成

我已经为您创建了自定义样式文件 `rs/css/twikoo-custom.css`，实现了以下优化：

### ✅ 布局改进
- **Nickname 独占一行** - 不再拥挤
- **Email 独占一行** - 清晰的输入布局
- **Website 输入框已隐藏** - 简化界面
- **优化间距** - 更舒适的视觉体验
- **响应式设计** - 移动端友好

### 🎯 样式特点
- 输入框获得焦点时有蓝色边框高亮
- 发送按钮使用品牌蓝色 (#0457a7)
- 圆角设计，现代化界面
- 字体统一使用 Nunito Sans

## 🚀 部署 Twikoo 后端

### 方案1：使用 Vercel 部署（推荐）

1. **Fork Twikoo 仓库**
   ```
   访问 https://github.com/twikoojs/twikoo
   点击 Fork 到您的账号
   ```

2. **部署到 Vercel**
   - 访问 [Vercel](https://vercel.com)
   - 导入您 fork 的 twikoo 仓库
   - 设置环境变量：
     ```
     MONGODB_URI=你的MongoDB连接字符串
     ```

3. **获取部署地址**
   - 部署完成后获得地址如：`https://your-twikoo.vercel.app`

### 方案2：使用腾讯云函数

1. 参考 [Twikoo 文档](https://twikoo.js.org/quick-start.html)
2. 在腾讯云创建云函数
3. 配置 MongoDB 数据库

### 方案3：自建服务器

```bash
# 安装 Twikoo
npm install -g tkserver

# 运行
tkserver
```

## 📝 配置说明

编辑 `rs/js/twikoo-init.js` 文件：

```javascript
twikoo.init({
    envId: 'https://twikoo-api.bloodmoney.ink', // 改为您的后端地址
    // ... 其他配置
});
```

### 重要配置项

| 配置项 | 当前值 | 说明 |
|--------|--------|------|
| `envId` | `https://twikoo-api.bloodmoney.ink` | **需要修改为您的实际后端地址** |
| `requiredFields` | `['nick', 'mail']` | 必填字段（昵称和邮箱） |
| `uploadImage` | `false` | 已禁用图片上传 |
| `inputMaxLength` | `500` | 评论最大字数 |
| `pageSize` | `10` | 每页显示评论数 |

## 🗄️ MongoDB 配置

### 免费 MongoDB 服务

1. **MongoDB Atlas（推荐）**
   - 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - 创建免费集群（512MB）
   - 获取连接字符串

2. **连接字符串格式**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/twikoo?retryWrites=true&w=majority
   ```

## 🔧 本地测试

1. **修改配置**
   ```javascript
   // rs/js/twikoo-init.js
   envId: 'http://localhost:8080', // 本地测试地址
   ```

2. **启动本地服务**
   ```bash
   tkserver --port 8080
   ```

## 📊 管理面板

访问您的网站评论区，点击"齿轮"图标进入管理面板：
- 首次访问需要设置管理员密码
- 可以审核、删除评论
- 配置反垃圾设置
- 查看评论统计

## 🛡️ 安全建议

1. **启用 Akismet 反垃圾**
   - 在管理面板配置 Akismet API Key
   - 自动过滤垃圾评论

2. **设置评论审核**
   - 可选择先审后发
   - 关键词过滤

3. **限制评论频率**
   - 已在配置中限制

## ❓ 常见问题

### 评论不显示？
- 检查 `envId` 是否正确
- 检查 MongoDB 连接是否正常
- 查看浏览器控制台错误

### 样式不生效？
- 清除浏览器缓存
- 确认 `twikoo-custom.css` 已加载

### 如何迁移旧评论？
- 可以通过管理面板导入导出功能
- 支持 JSON 格式数据

## 📚 更多资源

- [Twikoo 官方文档](https://twikoo.js.org)
- [Twikoo GitHub](https://github.com/twikoojs/twikoo)
- [常见问题解答](https://twikoo.js.org/faq.html)

---

**注意**：请务必将 `envId` 修改为您自己的 Twikoo 后端地址，否则评论功能无法正常工作！