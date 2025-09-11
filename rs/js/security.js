/**
 * Security and Anti-Spam Module for Comments System
 * Provides comprehensive protection against spam and abuse
 */

class SecurityManager {
    constructor(config = {}) {
        this.config = {
            maxCommentsPerHour: 5,
            maxCommentsPerDay: 20,
            minTimeBetweenComments: 30000, // 30 seconds
            honeypotFieldName: 'website', // Hidden field to trap bots
            spamKeywords: [
                'viagra', 'casino', 'poker', 'lottery', 'win money', 'make money fast',
                'click here', 'free money', 'work from home', 'buy now', 'limited time',
                'bitcoin', 'crypto', 'investment opportunity', 'earn $', '💰', '🤑',
                'spam', 'promotional', 'advertisement', 'marketing', 'seo', 'backlink',
                'loan', 'mortgage', 'insurance', 'pharmacy', 'pills', 'medication',
                'dating', 'escort', 'adult', 'xxx', 'porn', 'sex', 'nude'
            ],
            bannedDomains: [
                'tempmail.org', '10minutemail.com', 'guerrillamail.com',
                'mailinator.com', 'throwawaymails.com', 'temp-mail.org',
                'maildrop.cc', 'mailnesia.com', 'yopmail.com'
            ],
            suspiciousPatterns: [
                /(.)\1{4,}/i, // Repeated characters (aaaa, 1111, etc.)
                /https?:\/\/[^\s]+/gi, // Multiple URLs
                /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card patterns
                /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, // Phone number patterns
                /[^\w\s\.\!\?\,\-\'\"\(\)\[\]]/g, // Special characters beyond normal punctuation
            ],
            maxUrlsPerComment: 2,
            maxCapitalPercentage: 0.7, // 70% capitals is suspicious
            minCommentQuality: 0.3, // Quality score threshold
            ...config
        };
        
        this.rateLimiter = new RateLimiter(this.config);
        this.spamDetector = new SpamDetector(this.config);
        this.honeypot = new HoneypotManager(this.config);
    }
    
    /**
     * Comprehensive security validation for comments
     * @param {object} commentData - Comment data to validate
     * @param {object} context - Additional context (IP, user agent, etc.)
     * @returns {object} - Validation result
     */
    async validateComment(commentData, context = {}) {
        const results = {
            isValid: true,
            errors: [],
            warnings: [],
            riskScore: 0,
            details: {}
        };
        
        try {
            // Rate limiting check
            const rateLimitResult = this.rateLimiter.checkLimit(context.ip || 'unknown');
            if (!rateLimitResult.allowed) {
                results.isValid = false;
                results.errors.push('Rate limit exceeded. Please wait before posting another comment.');
                results.riskScore += 50;
                results.details.rateLimit = rateLimitResult;
            }
            
            // Honeypot validation
            const honeypotResult = this.honeypot.validate(commentData);
            if (!honeypotResult.valid) {
                results.isValid = false;
                results.errors.push('Suspected bot activity detected.');
                results.riskScore += 100; // Automatic fail
                results.details.honeypot = honeypotResult;
                return results; // Early return for obvious bots
            }
            
            // Spam content detection
            const spamResult = await this.spamDetector.analyzeComment(commentData);
            results.riskScore += spamResult.score;
            results.details.spam = spamResult;
            
            if (spamResult.isSpam) {
                results.isValid = false;
                results.errors.push('Comment appears to contain spam content.');
            } else if (spamResult.score > 30) {
                results.warnings.push('Comment flagged for manual review.');
            }
            
            // Email domain validation
            const emailResult = this.validateEmailDomain(commentData.email);
            if (!emailResult.valid) {
                results.isValid = false;
                results.errors.push('Email domain is not allowed.');
                results.riskScore += 30;
                results.details.email = emailResult;
            }
            
            // Content quality analysis
            const qualityResult = this.analyzeContentQuality(commentData.content);
            results.riskScore += qualityResult.penalties;
            results.details.quality = qualityResult;
            
            if (qualityResult.score < this.config.minCommentQuality) {
                results.warnings.push('Comment quality is low.');
            }
            
            // Final risk assessment
            if (results.riskScore >= 80) {
                results.isValid = false;
                results.errors.push('Comment blocked due to high risk score.');
            }
            
        } catch (error) {
            console.error('Security validation error:', error);
            results.errors.push('Validation error occurred.');
            results.isValid = false;
        }
        
        return results;
    }
    
    /**
     * Validate email domain against banned list
     * @param {string} email - Email address to check
     * @returns {object} - Validation result
     */
    validateEmailDomain(email) {
        const domain = email.split('@')[1]?.toLowerCase();
        
        if (!domain) {
            return { valid: false, reason: 'Invalid email format' };
        }
        
        const isBanned = this.config.bannedDomains.some(banned => 
            domain === banned || domain.endsWith('.' + banned)
        );
        
        return {
            valid: !isBanned,
            domain,
            reason: isBanned ? 'Temporary email domain not allowed' : null
        };
    }
    
    /**
     * Analyze content quality and detect suspicious patterns
     * @param {string} content - Comment content to analyze
     * @returns {object} - Quality analysis result
     */
    analyzeContentQuality(content) {
        const result = {
            score: 1.0,
            penalties: 0,
            flags: []
        };
        
        // Check for excessive capitals
        const capitalRatio = (content.match(/[A-Z]/g) || []).length / content.length;
        if (capitalRatio > this.config.maxCapitalPercentage) {
            result.penalties += 20;
            result.flags.push('excessive_capitals');
        }
        
        // Check for repeated characters/patterns
        this.config.suspiciousPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                result.penalties += 15;
                result.flags.push('suspicious_pattern');
            }
        });
        
        // Check URL count
        const urlMatches = content.match(/https?:\/\/[^\s]+/gi) || [];
        if (urlMatches.length > this.config.maxUrlsPerComment) {
            result.penalties += 25;
            result.flags.push('too_many_urls');
        }
        
        // Check for very short comments
        if (content.length < 10) {
            result.penalties += 10;
            result.flags.push('too_short');
        }
        
        // Check for gibberish (consonant/vowel ratio)
        const consonants = (content.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
        const vowels = (content.match(/[aeiou]/gi) || []).length;
        if (vowels > 0 && consonants / vowels > 3) {
            result.penalties += 15;
            result.flags.push('possible_gibberish');
        }
        
        result.score = Math.max(0, 1 - (result.penalties / 100));
        return result;
    }
    
    /**
     * Create honeypot fields for bot detection
     * @returns {string} - HTML for honeypot fields
     */
    createHoneypotFields() {
        return this.honeypot.generateFields();
    }
}

/**
 * Rate Limiter for preventing spam flooding
 */
class RateLimiter {
    constructor(config) {
        this.config = config;
        this.submissions = new Map(); // IP -> submission history
    }
    
    /**
     * Check if submission is within rate limits
     * @param {string} ip - IP address
     * @returns {object} - Rate limit result
     */
    checkLimit(ip) {
        const now = Date.now();
        const userSubmissions = this.submissions.get(ip) || [];
        
        // Clean old submissions
        const hourAgo = now - (60 * 60 * 1000);
        const dayAgo = now - (24 * 60 * 60 * 1000);
        const recentSubmissions = userSubmissions.filter(time => time > dayAgo);
        
        // Update stored data
        this.submissions.set(ip, recentSubmissions);
        
        // Check various limits
        const lastSubmission = Math.max(...recentSubmissions, 0);
        const timeSinceLastComment = now - lastSubmission;
        const commentsInLastHour = recentSubmissions.filter(time => time > hourAgo).length;
        const commentsInLastDay = recentSubmissions.length;
        
        // Rate limit checks
        if (timeSinceLastComment < this.config.minTimeBetweenComments) {
            return {
                allowed: false,
                reason: 'too_frequent',
                waitTime: this.config.minTimeBetweenComments - timeSinceLastComment
            };
        }
        
        if (commentsInLastHour >= this.config.maxCommentsPerHour) {
            return {
                allowed: false,
                reason: 'hourly_limit',
                resetTime: hourAgo + (60 * 60 * 1000)
            };
        }
        
        if (commentsInLastDay >= this.config.maxCommentsPerDay) {
            return {
                allowed: false,
                reason: 'daily_limit',
                resetTime: dayAgo + (24 * 60 * 60 * 1000)
            };
        }
        
        return { allowed: true };
    }
    
    /**
     * Record a successful submission
     * @param {string} ip - IP address
     */
    recordSubmission(ip) {
        const userSubmissions = this.submissions.get(ip) || [];
        userSubmissions.push(Date.now());
        this.submissions.set(ip, userSubmissions);
    }
    
    /**
     * Clear rate limit data (for testing or admin purposes)
     * @param {string} ip - IP address to clear
     */
    clearLimit(ip) {
        this.submissions.delete(ip);
    }
}

/**
 * Advanced Spam Detection Engine
 */
class SpamDetector {
    constructor(config) {
        this.config = config;
    }
    
    /**
     * Analyze comment for spam indicators
     * @param {object} commentData - Comment data to analyze
     * @returns {object} - Spam analysis result
     */
    async analyzeComment(commentData) {
        const result = {
            isSpam: false,
            score: 0,
            reasons: [],
            confidence: 0
        };
        
        // Keyword analysis
        const keywordResult = this.analyzeKeywords(commentData.content);
        result.score += keywordResult.score;
        if (keywordResult.matches.length > 0) {
            result.reasons.push(`Contains spam keywords: ${keywordResult.matches.join(', ')}`);
        }
        
        // Pattern analysis
        const patternResult = this.analyzePatterns(commentData.content);
        result.score += patternResult.score;
        result.reasons.push(...patternResult.reasons);
        
        // Author analysis
        const authorResult = this.analyzeAuthor(commentData.author, commentData.email);
        result.score += authorResult.score;
        result.reasons.push(...authorResult.reasons);
        
        // Language analysis
        const languageResult = this.analyzeLanguage(commentData.content);
        result.score += languageResult.score;
        result.reasons.push(...languageResult.reasons);
        
        // Final determination
        result.isSpam = result.score >= 50;
        result.confidence = Math.min(result.score / 100, 1.0);
        
        return result;
    }
    
    /**
     * Analyze content for spam keywords
     * @param {string} content - Content to analyze
     * @returns {object} - Keyword analysis result
     */
    analyzeKeywords(content) {
        const lowerContent = content.toLowerCase();
        const matches = this.config.spamKeywords.filter(keyword => 
            lowerContent.includes(keyword.toLowerCase())
        );
        
        return {
            score: matches.length * 15,
            matches,
            severity: matches.length > 2 ? 'high' : matches.length > 0 ? 'medium' : 'low'
        };
    }
    
    /**
     * Analyze content patterns
     * @param {string} content - Content to analyze
     * @returns {object} - Pattern analysis result
     */
    analyzePatterns(content) {
        const result = {
            score: 0,
            reasons: []
        };
        
        // Multiple exclamation marks
        if ((content.match(/!/g) || []).length > 3) {
            result.score += 10;
            result.reasons.push('Excessive exclamation marks');
        }
        
        // All caps words
        const capsWords = content.match(/\b[A-Z]{3,}\b/g) || [];
        if (capsWords.length > 2) {
            result.score += 15;
            result.reasons.push('Multiple all-caps words');
        }
        
        // Excessive emoji usage
        const emojiCount = (content.match(/[\u{1f600}-\u{1f64f}]|[\u{1f300}-\u{1f5ff}]|[\u{1f680}-\u{1f6ff}]|[\u{1f1e0}-\u{1f1ff}]/gu) || []).length;
        if (emojiCount > 5) {
            result.score += 10;
            result.reasons.push('Excessive emoji usage');
        }
        
        // Repeated punctuation
        if (/[.!?]{3,}/.test(content)) {
            result.score += 8;
            result.reasons.push('Repeated punctuation patterns');
        }
        
        return result;
    }
    
    /**
     * Analyze author information
     * @param {string} author - Author name
     * @param {string} email - Author email
     * @returns {object} - Author analysis result
     */
    analyzeAuthor(author, email) {
        const result = {
            score: 0,
            reasons: []
        };
        
        // Generic/suspicious names
        const genericNames = ['admin', 'user', 'test', 'guest', 'anonymous', 'spam', 'bot'];
        if (genericNames.some(name => author.toLowerCase().includes(name))) {
            result.score += 20;
            result.reasons.push('Suspicious author name');
        }
        
        // Random character names
        if (/^[a-z]{8,}$/i.test(author) || /\d{4,}/.test(author)) {
            result.score += 15;
            result.reasons.push('Random-looking author name');
        }
        
        // Email-name mismatch
        const emailName = email.split('@')[0];
        if (emailName && !author.toLowerCase().includes(emailName.toLowerCase()) && 
            !emailName.toLowerCase().includes(author.toLowerCase())) {
            result.score += 5;
            result.reasons.push('Name-email mismatch');
        }
        
        return result;
    }
    
    /**
     * Analyze language patterns
     * @param {string} content - Content to analyze
     * @returns {object} - Language analysis result
     */
    analyzeLanguage(content) {
        const result = {
            score: 0,
            reasons: []
        };
        
        // Non-English characters mixed with English (possible bot)
        const englishChars = content.match(/[a-zA-Z]/g) || [];
        const nonEnglishChars = content.match(/[^\x00-\x7F]/g) || [];
        
        if (englishChars.length > 10 && nonEnglishChars.length > englishChars.length * 0.3) {
            result.score += 10;
            result.reasons.push('Mixed character sets detected');
        }
        
        // Very poor grammar indicators
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 3);
        let grammarIssues = 0;
        
        sentences.forEach(sentence => {
            // No spaces after punctuation
            if (/[,;:][a-zA-Z]/.test(sentence)) grammarIssues++;
            // Multiple spaces
            if (/\s{3,}/.test(sentence)) grammarIssues++;
            // No capital letters at start
            if (sentence.trim().length > 0 && /^[a-z]/.test(sentence.trim())) grammarIssues++;
        });
        
        if (grammarIssues > sentences.length * 0.5) {
            result.score += 12;
            result.reasons.push('Multiple grammar issues detected');
        }
        
        return result;
    }
}

/**
 * Honeypot Manager for bot detection
 */
class HoneypotManager {
    constructor(config) {
        this.config = config;
        this.fieldName = config.honeypotFieldName;
    }
    
    /**
     * Generate honeypot HTML fields
     * @returns {string} - HTML string for honeypot fields
     */
    generateFields() {
        return `
            <div style="position: absolute; left: -9999px; opacity: 0; pointer-events: none;">
                <label for="${this.fieldName}">Website (leave blank)</label>
                <input type="text" id="${this.fieldName}" name="${this.fieldName}" tabindex="-1" autocomplete="off">
                <input type="checkbox" name="confirm_human" value="1" style="display: none;">
                <input type="email" name="alt_email" style="display: none;">
            </div>
        `;
    }
    
    /**
     * Validate honeypot fields
     * @param {object} formData - Form data to validate
     * @returns {object} - Validation result
     */
    validate(formData) {
        const honeypotValue = formData[this.fieldName];
        
        // If honeypot field has any value, it's likely a bot
        if (honeypotValue && honeypotValue.trim().length > 0) {
            return {
                valid: false,
                reason: 'honeypot_filled',
                value: honeypotValue
            };
        }
        
        // Check other hidden fields
        if (formData.confirm_human || formData.alt_email) {
            return {
                valid: false,
                reason: 'hidden_fields_filled',
                fields: { confirm_human: formData.confirm_human, alt_email: formData.alt_email }
            };
        }
        
        return { valid: true };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SecurityManager = SecurityManager;
    window.RateLimiter = RateLimiter;
    window.SpamDetector = SpamDetector;
    window.HoneypotManager = HoneypotManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecurityManager, RateLimiter, SpamDetector, HoneypotManager };
}