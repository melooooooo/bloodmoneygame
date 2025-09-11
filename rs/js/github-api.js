/**
 * GitHub API Integration for Comments System
 * Now uses Cloudflare Worker for secure API interactions
 */

class GitHubAPI {
    constructor(config = {}) {
        this.config = {
            // Worker API endpoint - update this based on your deployment
            workerUrl: config.workerUrl || 'https://bloodmoney.ink/api',
            // For local development, use: 'http://localhost:8787/api'
            owner: config.owner || 'melooooooo',
            repo: config.repo || 'bloodmoneygame',
            branch: config.branch || 'main',
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
        
        this.isSubmitting = false;
    }
    
    /**
     * Submit a new comment via Cloudflare Worker
     * @param {string} gameId - The game identifier
     * @param {object} commentData - The comment object to add
     * @returns {Promise<boolean>} - Success status
     */
    async submitComment(gameId, commentData) {
        if (this.isSubmitting) {
            throw new Error('Another comment submission is in progress');
        }
        
        this.isSubmitting = true;
        
        try {
            const response = await fetch(`${this.config.workerUrl}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameId: gameId,
                    comment: commentData
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to submit comment: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Comment successfully submitted:', result.message);
            return true;
            
        } catch (error) {
            console.error('Comment submission error:', error);
            throw error;
        } finally {
            this.isSubmitting = false;
        }
    }
    
    /**
     * Get current comments.json file content from GitHub
     * @returns {Promise<object>} - File content and SHA
     */
    async getFileContent() {
        const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.filePath}`;
        
        const response = await this.makeRequest(url, {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get file content: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Decode base64 content
        const content = JSON.parse(atob(data.content));
        
        return {
            data: content,
            sha: data.sha
        };
    }
    
    /**
     * Add new comment to the comments data structure
     * @param {object} commentsData - Current comments data
     * @param {string} gameId - Game identifier
     * @param {object} commentData - New comment to add
     * @returns {object} - Updated comments data
     */
    addCommentToData(commentsData, gameId, commentData) {
        const updatedData = { ...commentsData };
        
        // Initialize game array if it doesn't exist
        if (!updatedData[gameId]) {
            updatedData[gameId] = [];
        }
        
        // Add new comment to the beginning of the array (newest first)
        updatedData[gameId].unshift(commentData);
        
        // Limit comments per game (optional)
        const maxCommentsPerGame = 100;
        if (updatedData[gameId].length > maxCommentsPerGame) {
            updatedData[gameId] = updatedData[gameId].slice(0, maxCommentsPerGame);
        }
        
        return updatedData;
    }
    
    /**
     * Update the comments.json file on GitHub
     * @param {object} newContent - Updated comments data
     * @param {string} sha - Current file SHA
     * @param {object} commentData - Comment data for commit message
     * @returns {Promise<boolean>} - Success status
     */
    async updateFile(newContent, sha, commentData) {
        const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.filePath}`;
        
        // Encode content as base64
        const encodedContent = btoa(JSON.stringify(newContent, null, 2));
        
        const commitMessage = `Add new comment by ${commentData.author}\n\n🤖 Generated with BloodMoney Comments System\n\nCo-Authored-By: Comments System <noreply@bloodmoney.ink>`;
        
        const requestBody = {
            message: commitMessage,
            content: encodedContent,
            sha: sha,
            branch: this.config.branch
        };
        
        const response = await this.makeRequest(url, {
            method: 'PUT',
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update file: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return true;
    }
    
    /**
     * Make HTTP request with retry logic
     * @param {string} url - Request URL
     * @param {object} options - Fetch options
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<Response>} - Fetch response
     */
    async makeRequest(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);
            
            // If rate limited, wait and retry
            if (response.status === 403 && retryCount < this.config.maxRetries) {
                const resetTime = response.headers.get('X-RateLimit-Reset');
                const waitTime = resetTime ? 
                    Math.max((parseInt(resetTime) * 1000) - Date.now(), 1000) : 
                    this.config.retryDelay * Math.pow(2, retryCount);
                
                console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
                await this.sleep(waitTime);
                return this.makeRequest(url, options, retryCount + 1);
            }
            
            // If server error, retry
            if (response.status >= 500 && retryCount < this.config.maxRetries) {
                console.log(`Server error (${response.status}). Retrying in ${this.config.retryDelay}ms...`);
                await this.sleep(this.config.retryDelay * Math.pow(2, retryCount));
                return this.makeRequest(url, options, retryCount + 1);
            }
            
            return response;
            
        } catch (error) {
            if (retryCount < this.config.maxRetries) {
                console.log(`Request failed. Retrying in ${this.config.retryDelay}ms...`);
                await this.sleep(this.config.retryDelay * Math.pow(2, retryCount));
                return this.makeRequest(url, options, retryCount + 1);
            }
            throw error;
        }
    }
    
    /**
     * Get headers for GitHub API requests
     * @returns {object} - Request headers
     */
    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'BloodMoney-Comments/1.0'
        };
        
        if (this.config.token) {
            headers['Authorization'] = `token ${this.config.token}`;
        }
        
        return headers;
    }
    
    /**
     * Sleep utility function
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Check if API is properly configured
     * @returns {boolean} - Configuration status
     */
    isConfigured() {
        return !!(this.config.owner && this.config.repo && this.config.token);
    }
    
    /**
     * Get API rate limit status
     * @returns {Promise<object>} - Rate limit information
     */
    async getRateLimit() {
        try {
            const url = `${this.config.apiUrl}/rate_limit`;
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to get rate limit:', error);
        }
        return null;
    }
}

/**
 * Comments GitHub Integration
 * Enhanced version of the comments system with GitHub integration
 */
class CommentsGitHubIntegration {
    constructor(commentsSystem, githubConfig = {}) {
        this.commentsSystem = commentsSystem;
        this.githubAPI = new GitHubAPI(githubConfig);
        
        // Override the original submitCommentToGitHub method
        this.commentsSystem.submitCommentToGitHub = this.submitCommentToGitHub.bind(this);
    }
    
    /**
     * Submit comment via GitHub API
     * @param {object} commentData - Comment to submit
     * @returns {Promise<void>}
     */
    async submitCommentToGitHub(commentData) {
        // Check if GitHub API is configured
        if (!this.githubAPI.isConfigured()) {
            throw new Error('GitHub API is not properly configured. Comments cannot be submitted.');
        }
        
        try {
            // Submit comment to GitHub
            const success = await this.githubAPI.submitComment(
                this.commentsSystem.gameId, 
                commentData
            );
            
            if (success) {
                // Show success message
                this.commentsSystem.showMessage(
                    'Comment submitted successfully! It will appear when the site updates.', 
                    'success'
                );
                
                // Optionally refresh comments after a delay to show the new comment
                setTimeout(() => {
                    this.commentsSystem.loadComments();
                }, 30000); // Wait 30 seconds for GitHub Pages to rebuild
                
                return true;
            }
            
        } catch (error) {
            console.error('GitHub submission error:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Failed to submit comment. ';
            
            if (error.message.includes('rate limit')) {
                errorMessage += 'API rate limit exceeded. Please try again later.';
            } else if (error.message.includes('403')) {
                errorMessage += 'Access denied. Please check configuration.';
            } else if (error.message.includes('404')) {
                errorMessage += 'Repository not found. Please check configuration.';
            } else {
                errorMessage += 'Please try again later.';
            }
            
            throw new Error(errorMessage);
        }
    }
    
    /**
     * Initialize GitHub integration with environment detection
     * @param {object} commentsSystem - The comments system instance
     * @param {object} config - Configuration options
     * @returns {CommentsGitHubIntegration|null} - Integration instance or null if not available
     */
    static initialize(commentsSystem, config = {}) {
        // In a real production environment, you would detect the GitHub token
        // from environment variables or a secure configuration
        const githubToken = config.githubToken || 
                           window.GITHUB_TOKEN || 
                           process?.env?.GITHUB_TOKEN ||
                           null;
        
        if (!githubToken) {
            console.warn('GitHub token not found. Comments will be simulated.');
            
            // Provide a fallback that simulates the submission
            commentsSystem.submitCommentToGitHub = async function(commentData) {
                console.log('Simulating GitHub submission:', commentData);
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // For demo purposes, add the comment to local data
                if (!this.comments.find(c => c.id === commentData.id)) {
                    this.comments.unshift(commentData);
                    this.updateCommentsCount();
                    this.renderComments();
                }
                
                throw new Error('GitHub integration is not configured. This is a demo submission.');
            }.bind(commentsSystem);
            
            return null;
        }
        
        const githubConfig = {
            owner: config.owner || 'melooooooo',
            repo: config.repo || 'bloodmoneygame',
            token: githubToken,
            ...config
        };
        
        return new CommentsGitHubIntegration(commentsSystem, githubConfig);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GitHubAPI = GitHubAPI;
    window.CommentsGitHubIntegration = CommentsGitHubIntegration;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GitHubAPI, CommentsGitHubIntegration };
}