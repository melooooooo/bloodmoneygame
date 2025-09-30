/**
 * Twikoo 评论系统初始化
 */

document.addEventListener('DOMContentLoaded', function() {
    // 检查是否存在评论容器
    const commentContainer = document.getElementById('tcomment');
    
    if (commentContainer) {
        // 初始化 Twikoo
        twikoo.init({
            envId: 'https://twikoo-api.bloodmoney.ink', // 您的Twikoo环境ID或自建服务端地址
            el: '#tcomment', // 评论容器元素
            region: '', // 地区，如果使用腾讯云函数，需要填写
            path: window.location.pathname, // 当前页面路径，用于区分不同页面的评论
            lang: 'en-US', // 语言设置
            visitor: true, // 显示访问量
            commentCount: true, // 显示评论数

            // 自定义配置
            placeholder: 'Share your thoughts about this game...', // 评论框占位符
            pageSize: 10, // 每页评论数
            noComment: 'No comments yet. Be the first to share your thoughts!', // 无评论时的提示

            // 输入框配置
            requiredFields: ['nick', 'mail'], // 必填字段：昵称和邮箱
            inputMaxLength: 500, // 评论最大字数

            // 功能开关
            uploadImage: false, // 禁用图片上传
            emoji: false, // 关闭表情面板，保持界面简洁

            // 其他配置
            highlight: true, // 代码高亮
            highlightTheme: 'github', // 高亮主题

            // 自定义文本
            locale: {
                'nick': 'Nickname',
                'mail': 'Email',
                'link': 'Website',
                'placeholder': 'Share your thoughts about this game...',
                'noComment': 'No comments yet',
                'submit': 'Send',
                'loading': 'Loading...',
                'error': 'Failed to load comments',
                'replyTo': 'Reply to',
                'cancelReply': 'Cancel Reply'
            }
        });

        // 确保工具栏 SVG / IMG 不会被放大：在 Twikoo 加载后注入最高优先级样式
        (function ensureToolbarClamp(){
            const STYLE_ID = 'twikoo-runtime-overrides';
            const css = `
            .twikoo .tk-submit-action-icon .tk-icon button{ width:36px !important; height:36px !important; padding:0 !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; }
            .twikoo .tk-submit-action-icon svg,
            .twikoo .tk-submit-action-icon > svg,
            .twikoo .tk-submit-action-icon img,
            .twikoo .tk-submit-action-icon a img{ width:22px !important; height:22px !important; max-width:22px !important; max-height:22px !important; object-fit:contain !important; display:inline-block !important; }
            .twikoo .tk-submit-action-icon{ align-items:center !important; gap:10px !important; }
            .twikoo .OwO svg{ width:22px !important; height:22px !important; }
            `;
            let styleEl = document.getElementById(STYLE_ID);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = STYLE_ID;
                styleEl.type = 'text/css';
                styleEl.appendChild(document.createTextNode(css));
                // 放在 <head> 末尾，尽量晚于 Twikoo 注入的内联样式
                (document.head || document.documentElement).appendChild(styleEl);
            } else {
                styleEl.textContent = css;
                styleEl.parentElement?.appendChild(styleEl); // 重新放到最后，提高优先级
            }
        })();

        // 添加评论数统计功能
        if (typeof twikoo !== 'undefined' && twikoo.getCommentsCount) {
            twikoo.getCommentsCount({
                envId: 'https://twikoo-api.bloodmoney.ink',
                urls: [window.location.pathname],
                includeReply: true
            }).then(function (res) {
                const count = res[0] ? res[0].count : 0;
                // 更新评论数显示
                const countElements = document.querySelectorAll('.comments-count, #comments-count');
                countElements.forEach(el => {
                    el.textContent = count;
                });
            }).catch(function (err) {
                console.error('Failed to get comments count:', err);
            });
        }

        console.log('Twikoo initialized successfully');
    } else {
        console.warn('Twikoo container #tcomment not found');
    }
});

// 页面路径映射函数
function getPageIdentifier() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    // 游戏页面映射
    const gameMapping = {
        'index.html': 'bloodmoney',
        '': 'bloodmoney',
        '/': 'bloodmoney',
        'BloodMoney2': 'bloodmoney2',
        'bloodmoney2': 'bloodmoney2',
        'BloodMoney2.html': 'bloodmoney2',
        'bloodmoney-unblocked': 'bloodmoney-unblocked',
        'bloodmoney-unblocked.html': 'bloodmoney-unblocked',
        'the-baby-in-yellow': 'the-baby-in-yellow',
        'the-baby-in-yellow.html': 'the-baby-in-yellow',
        'buckshot-roulette': 'buckshot-roulette',
        'buckshot-roulette.html': 'buckshot-roulette',
        'scary-teacher-3d': 'scary-teacher-3d',
        'scary-teacher-3d.html': 'scary-teacher-3d',
        'granny-horror': 'granny-horror',
        'granny-horror.html': 'granny-horror',
        'thats-not-my-neighbor': 'thats-not-my-neighbor',
        'thats-not-my-neighbor.html': 'thats-not-my-neighbor',
        'we-become-what-we-behold': 'we-become-what-we-behold',
        'we-become-what-we-behold.html': 'we-become-what-we-behold',
        'do-not-take-this-cat-home': 'do-not-take-this-cat-home',
        'do-not-take-this-cat-home.html': 'do-not-take-this-cat-home',
        'italian-brainrot-clicker': 'italian-brainrot-clicker',
        'italian-brainrot-clicker.html': 'italian-brainrot-clicker'
    };
    
    return gameMapping[filename] || gameMapping[path] || 'bloodmoney';
}
