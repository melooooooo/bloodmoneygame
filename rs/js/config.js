/**
 * Configuration file for BloodMoney Comments System
 * This file contains environment-specific settings
 */

const CommentsConfig = {
    // API Configuration
    api: {
        // Production: Use your Cloudflare Worker URL
        workerUrl: 'https://bloodmoney.ink/api',
        // Development: Use local Worker or test endpoint
        // workerUrl: 'http://localhost:8787/api',
    },
    
    // GitHub Repository Settings (for reference only, not used directly)
    github: {
        owner: 'melooooooo',
        repo: 'bloodmoneygame',
        branch: 'main',
        // Token is now securely stored in Cloudflare Worker
    },
    
    // Comments System Settings
    comments: {
        maxCommentLength: 1000,
        minCommentLength: 10,
        maxCommentsPerGame: 100,
        rateLimit: 60000, // 1 minute between comments per user
        moderationEnabled: false, // Set to true to enable comment moderation
        allowAnonymous: true,
        allowReplies: true,
        allowVoting: true,
    },
    
    // Anti-spam Settings
    spam: {
        enabled: true,
        keywords: [
            'spam', 'viagra', 'casino', 'win money', 'click here',
            'buy now', 'free money', 'make money fast', 'work from home',
            'bitcoin', 'crypto', 'investment opportunity'
        ],
        maxLinks: 2, // Maximum links allowed in a comment
        minTimeBetweenComments: 30000, // 30 seconds minimum between comments
    },
    
    // UI Settings
    ui: {
        theme: 'light', // 'light' or 'dark'
        showEmail: false, // Whether to display email addresses (should be false)
        showTimestamp: true,
        showVoteCounts: true,
        animationsEnabled: true,
        autoRefresh: false, // Auto-refresh comments every X minutes
        refreshInterval: 300000, // 5 minutes
    },
    
    // Security Settings
    security: {
        requireEmailVerification: false,
        allowedDomains: [], // Empty array allows all domains
        blockedIPs: [],
        maxSubmissionsPerIP: 10, // Per day
        honeypotEnabled: true, // Add hidden fields to catch bots
    },
    
    // Performance Settings
    performance: {
        lazyLoadComments: false,
        commentsPerPage: 50,
        enableCaching: true,
        cacheTimeout: 300000, // 5 minutes
    },
    
    // Development Settings
    development: {
        debug: false,
        simulateGitHubAPI: false, // For testing without GitHub API
        showDebugInfo: false,
        logAPIRequests: false,
    }
};

/**
 * Environment Detection and Configuration
 */
class ConfigManager {
    constructor() {
        this.config = { ...CommentsConfig };
        this.detectEnvironment();
        this.loadEnvironmentConfig();
    }
    
    /**
     * Detect current environment
     */
    detectEnvironment() {
        // Detect if running in development
        this.isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname.includes('.local');
        
        // Detect if running on GitHub Pages
        this.isGitHubPages = window.location.hostname.includes('.github.io') ||
                           window.location.hostname.includes('pages.dev');
        
        // Detect if running on Cloudflare Pages
        this.isCloudflarePages = window.location.hostname.includes('.pages.dev') ||
                                window.location.search.includes('cf-page');
        
        // Set environment-specific defaults
        if (this.isDevelopment) {
            this.config.development.debug = true;
            this.config.development.simulateGitHubAPI = true;
            this.config.development.showDebugInfo = true;
        }
    }
    
    /**
     * Load environment-specific configuration
     */
    loadEnvironmentConfig() {
        try {
            // Try to load GitHub token from various sources
            const githubToken = this.getGitHubToken();
            if (githubToken) {
                this.config.github.token = githubToken;
            }
            
            // Load other environment variables if available
            if (typeof process !== 'undefined' && process.env) {
                // Node.js environment variables
                this.loadFromProcessEnv();
            }
            
            // Load from localStorage for development
            if (this.isDevelopment) {
                this.loadFromLocalStorage();
            }
            
        } catch (error) {
            console.warn('Failed to load environment configuration:', error);
        }
    }
    
    /**
     * Get GitHub token from various sources
     */
    getGitHubToken() {
        // Priority order for token sources:
        // 1. Window global variable (for development)
        // 2. Process environment (Node.js/Cloudflare Pages)
        // 3. localStorage (development only)
        // 4. Meta tag (Cloudflare Pages build time injection)
        // 5. Configuration file (not recommended for production)
        
        // Check window global variable first
        if (window.GITHUB_TOKEN) {
            return window.GITHUB_TOKEN;
        }
        
        // Check process environment (Node.js/Workers)
        if (typeof process !== 'undefined' && process.env?.GITHUB_TOKEN) {
            return process.env.GITHUB_TOKEN;
        }
        
        // Check localStorage (development only)
        if (this.isDevelopment && localStorage.getItem('github_token')) {
            return localStorage.getItem('github_token');
        }
        
        // Check meta tag (build time injection from Cloudflare Pages)
        const tokenMeta = document.querySelector('meta[name="github-token"]');
        if (tokenMeta) {
            return tokenMeta.getAttribute('content');
        }
        
        // Check build-time injected global variable
        if (typeof GITHUB_TOKEN !== 'undefined') {
            return GITHUB_TOKEN;
        }
        
        return null;
    }
    
    /**
     * Load configuration from process environment
     */
    loadFromProcessEnv() {
        const env = process.env;
        
        // GitHub settings
        if (env.GITHUB_OWNER) this.config.github.owner = env.GITHUB_OWNER;
        if (env.GITHUB_REPO) this.config.github.repo = env.GITHUB_REPO;
        if (env.GITHUB_BRANCH) this.config.github.branch = env.GITHUB_BRANCH;
        
        // Comments settings
        if (env.MAX_COMMENT_LENGTH) {
            this.config.comments.maxCommentLength = parseInt(env.MAX_COMMENT_LENGTH);
        }
        if (env.RATE_LIMIT) {
            this.config.comments.rateLimit = parseInt(env.RATE_LIMIT);
        }
        
        // Feature flags
        if (env.MODERATION_ENABLED === 'true') {
            this.config.comments.moderationEnabled = true;
        }
        if (env.SPAM_DETECTION_ENABLED === 'false') {
            this.config.spam.enabled = false;
        }
    }
    
    /**
     * Load development configuration from localStorage
     */
    loadFromLocalStorage() {
        try {
            const devConfig = localStorage.getItem('comments_dev_config');
            if (devConfig) {
                const parsedConfig = JSON.parse(devConfig);
                this.config = { ...this.config, ...parsedConfig };
            }
        } catch (error) {
            console.warn('Failed to load dev configuration from localStorage:', error);
        }
    }
    
    /**
     * Get configuration value by path
     * @param {string} path - Configuration path (e.g., 'github.token')
     * @returns {any} - Configuration value
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }
    
    /**
     * Set configuration value by path
     * @param {string} path - Configuration path
     * @param {any} value - Value to set
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);
        target[lastKey] = value;
    }
    
    /**
     * Get all configuration
     * @returns {object} - Complete configuration object
     */
    getAll() {
        return { ...this.config };
    }
    
    /**
     * Save development configuration to localStorage
     */
    saveDevelopmentConfig() {
        if (this.isDevelopment) {
            try {
                localStorage.setItem('comments_dev_config', JSON.stringify(this.config));
            } catch (error) {
                console.warn('Failed to save dev configuration:', error);
            }
        }
    }
    
    /**
     * Reset configuration to defaults
     */
    reset() {
        this.config = { ...CommentsConfig };
        this.detectEnvironment();
        this.loadEnvironmentConfig();
    }
    
    /**
     * Validate configuration
     * @returns {object} - Validation results
     */
    validate() {
        const errors = [];
        const warnings = [];
        
        // Check required GitHub settings
        if (!this.config.github.owner) {
            errors.push('GitHub owner is required');
        }
        if (!this.config.github.repo) {
            errors.push('GitHub repository is required');
        }
        if (!this.config.github.token && !this.isDevelopment) {
            warnings.push('GitHub token is not configured - comments will not be saved');
        }
        
        // Check comment settings
        if (this.config.comments.maxCommentLength < this.config.comments.minCommentLength) {
            errors.push('Max comment length must be greater than min comment length');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// Create global configuration manager instance
const configManager = new ConfigManager();

// Development helper for configuration management
if (configManager.isDevelopment) {
    window.CommentsConfig = configManager;
    
    // Add helper functions to window for debugging
    window.setGitHubToken = (token) => {
        localStorage.setItem('github_token', token);
        configManager.loadEnvironmentConfig();
        console.log('GitHub token updated');
    };
    
    window.clearGitHubToken = () => {
        localStorage.removeItem('github_token');
        configManager.loadEnvironmentConfig();
        console.log('GitHub token cleared');
    };
    
    window.showCommentsConfig = () => {
        console.log('Current Comments Configuration:', configManager.getAll());
        const validation = configManager.validate();
        console.log('Configuration Validation:', validation);
    };
}

// Export configuration manager
if (typeof window !== 'undefined') {
    window.configManager = configManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommentsConfig, ConfigManager, configManager };
}