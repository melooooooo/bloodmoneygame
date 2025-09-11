#!/bin/bash

# Twikoo 部署脚本 for BloodMoney Games
# 使用方法: ./deploy-twikoo.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Twikoo 评论系统..."
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -d "twikoo-deploy" ]; then
    echo -e "${RED}错误: twikoo-deploy 目录不存在${NC}"
    echo "请确保您在 bloodmoneygame 项目根目录运行此脚本"
    exit 1
fi

cd twikoo-deploy

# 步骤 1: 检查 Wrangler 是否安装
echo -e "${YELLOW}步骤 1: 检查 Wrangler CLI...${NC}"
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Wrangler 未安装。正在安装...${NC}"
    npm install -g wrangler
else
    echo -e "${GREEN}✓ Wrangler 已安装${NC}"
fi

# 步骤 2: 检查登录状态
echo -e "${YELLOW}步骤 2: 检查 Cloudflare 登录状态...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo "需要登录 Cloudflare..."
    wrangler login
else
    echo -e "${GREEN}✓ 已登录 Cloudflare${NC}"
fi

# 步骤 3: 安装依赖
echo -e "${YELLOW}步骤 3: 安装项目依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "安装 npm 依赖..."
    npm install --cache /tmp/npm-cache || {
        echo -e "${RED}npm install 失败，尝试清理缓存...${NC}"
        rm -rf node_modules package-lock.json
        npm install
    }
else
    echo -e "${GREEN}✓ 依赖已安装${NC}"
fi

# 步骤 4: 创建 D1 数据库
echo -e "${YELLOW}步骤 4: 创建 D1 数据库...${NC}"
echo "正在创建数据库 'twikoo-bloodmoney'..."

# 执行创建命令并捕获输出
DB_OUTPUT=$(npx wrangler d1 create twikoo-bloodmoney 2>&1) || {
    if echo "$DB_OUTPUT" | grep -q "already exists"; then
        echo -e "${YELLOW}数据库已存在，跳过创建${NC}"
    else
        echo -e "${RED}创建数据库失败：$DB_OUTPUT${NC}"
        exit 1
    fi
}

# 提取 database_id
if echo "$DB_OUTPUT" | grep -q "database_id"; then
    DATABASE_ID=$(echo "$DB_OUTPUT" | grep "database_id" | sed 's/.*database_id = "\(.*\)".*/\1/')
    echo -e "${GREEN}✓ 数据库创建成功${NC}"
    echo "Database ID: $DATABASE_ID"
    
    # 更新 wrangler.toml
    echo -e "${YELLOW}更新 wrangler.toml 配置...${NC}"
    sed -i.bak "s/YOUR_DATABASE_ID_HERE/$DATABASE_ID/g" wrangler.toml
    echo -e "${GREEN}✓ 配置已更新${NC}"
fi

# 步骤 5: 初始化数据库架构
echo -e "${YELLOW}步骤 5: 初始化数据库架构...${NC}"
npx wrangler d1 execute twikoo-bloodmoney --remote --file=./schema.sql || {
    echo -e "${YELLOW}数据库可能已初始化，继续...${NC}"
}

# 步骤 6: 创建 R2 存储桶
echo -e "${YELLOW}步骤 6: 创建 R2 存储桶...${NC}"
npx wrangler r2 bucket create twikoo-bloodmoney || {
    echo -e "${YELLOW}R2 存储桶可能已存在，继续...${NC}"
}

# 步骤 7: 部署 Worker
echo -e "${YELLOW}步骤 7: 部署 Worker 到 Cloudflare...${NC}"
DEPLOY_OUTPUT=$(npx wrangler deploy --minify 2>&1)
echo "$DEPLOY_OUTPUT"

# 提取 Worker URL
WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep "https://" | grep "workers.dev" | head -1 | sed 's/.*\(https:\/\/[^ ]*\).*/\1/')

if [ -n "$WORKER_URL" ]; then
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo "================================"
    echo -e "${GREEN}Worker URL: $WORKER_URL${NC}"
    echo ""
    echo "下一步操作："
    echo "1. 更新 rs/js/twikoo-init.js 中的 envId 为: $WORKER_URL"
    echo "2. 访问测试页面: test-twikoo.html"
    echo "3. 设置管理员密码: 访问 $WORKER_URL"
    echo ""
    
    # 自动更新前端配置
    echo -e "${YELLOW}是否自动更新前端配置文件？(y/n)${NC}"
    read -r UPDATE_CONFIG
    if [ "$UPDATE_CONFIG" = "y" ]; then
        cd ..
        sed -i.bak "s|https://twikoo-bloodmoney.YOUR_USERNAME.workers.dev|$WORKER_URL|g" rs/js/twikoo-init.js
        sed -i.bak "s|https://twikoo-bloodmoney.YOUR_USERNAME.workers.dev|$WORKER_URL|g" test-twikoo.html
        echo -e "${GREEN}✓ 前端配置已更新${NC}"
    fi
else
    echo -e "${RED}部署可能失败，请检查输出信息${NC}"
fi

echo "================================"
echo -e "${GREEN}部署脚本执行完成！${NC}"