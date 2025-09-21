/**
 * Build-time configuration injection for Cloudflare Pages
 * 为Cloudflare Pages构建时注入环境变量配置
 */

const fs = require('fs').promises;
const path = require('path');

async function injectBuildTimeConfig() {
    console.log('🔧 开始注入构建时配置...');
    
    // 获取环境变量 (不再包含敏感的 GITHUB_TOKEN)
    const config = {
        GITHUB_OWNER: process.env.GITHUB_OWNER || 'melooooooo',
        GITHUB_REPO: process.env.GITHUB_REPO || 'bloodmoneygame',
        GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',
        WORKER_URL: process.env.WORKER_URL || 'https://bloodmoney.ink/api',
        BUILD_TIME: new Date().toISOString(),
        BUILD_ENV: process.env.NODE_ENV || 'production'
    };
    
    console.log('📋 构建配置:', config);
    
    // 创建运行时配置文件
    const runtimeConfig = `
/**
 * 构建时注入的配置
 * Build-time injected configuration
 * 生成时间: ${config.BUILD_TIME}
 */

(function() {
    'use strict';
    
    // 设置全局配置变量
    if (typeof window !== 'undefined') {
        window.BUILD_CONFIG = {
            GITHUB_OWNER: '${config.GITHUB_OWNER}',
            GITHUB_REPO: '${config.GITHUB_REPO}',
            GITHUB_BRANCH: '${config.GITHUB_BRANCH}',
            WORKER_URL: '${config.WORKER_URL}',
            BUILD_TIME: '${config.BUILD_TIME}',
            BUILD_ENV: '${config.BUILD_ENV}'
        };
        
        // GitHub Token 现在安全地存储在 Cloudflare Worker 中
        
        console.log('🔧 构建配置已加载:', window.BUILD_CONFIG);
    }
})();
`;
    
    // 写入构建配置文件
    const configPath = path.join(__dirname, 'rs', 'js', 'build-config.js');
    await fs.writeFile(configPath, runtimeConfig.trim());
    console.log('✅ 构建配置已写入:', configPath);
    
    // 为HTML文件注入meta标签
    await injectMetaTags(config);
    
    console.log('🎉 构建时配置注入完成！');
}

async function injectMetaTags(config) {
    const htmlFiles = ['index.html', 'BloodMoney2.html'];
    
    for (const htmlFile of htmlFiles) {
        try {
            const htmlPath = path.join(__dirname, htmlFile);
            let content = await fs.readFile(htmlPath, 'utf-8');
            
            // 查找head标签
            const headEndIndex = content.indexOf('</head>');
            if (headEndIndex === -1) continue;
            
            // 构建meta标签
            const metaTags = `
    <!-- Build-time Configuration -->
    <meta name="build-time" content="${config.BUILD_TIME}">
    <meta name="build-env" content="${config.BUILD_ENV}">
    <meta name="github-owner" content="${config.GITHUB_OWNER}">
    <meta name="github-repo" content="${config.GITHUB_REPO}">
    <meta name="worker-url" content="${config.WORKER_URL}">
    <!-- GitHub token is now securely stored in Cloudflare Worker -->
    `;
            
            // 插入meta标签
            content = content.slice(0, headEndIndex) + metaTags + content.slice(headEndIndex);
            
            await fs.writeFile(htmlPath, content);
            console.log(`✅ Meta标签已注入: ${htmlFile}`);
            
        } catch (error) {
            console.warn(`⚠️ 无法处理HTML文件 ${htmlFile}:`, error.message);
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    injectBuildTimeConfig().catch(error => {
        console.error('❌ 构建配置注入失败:', error);
        process.exit(1);
    });
}

module.exports = { injectBuildTimeConfig };