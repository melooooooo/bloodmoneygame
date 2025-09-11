/**
 * BloodMoney Games Comments System
 * JSON file-based comment system with GitHub API integration
 */

class CommentsSystem {
    constructor(gameId, options = {}) {
        this.gameId = gameId;
        this.comments = [];
        this.currentSort = 'newest';
        this.isSubmitting = false;

        // Configuration
        this.config = {
            apiEndpoint: '/data/comments.json',
            githubRepo: options.githubRepo || 'melooooooo/bloodmoneygame',
            githubToken: options.githubToken || null,
            maxCommentLength: 1000,
            minCommentLength: 10,
            rateLimit: 60000, // 1 minute between comments
            ...options
        };

        // Initialize security manager
        this.security = new SecurityManager(this.config);

        this.init();
    }

    init() {
        this.createCommentsHTML();
        this.loadComments();
        this.bindEvents();
    }

    // Create the comments section HTML structure
    createCommentsHTML() {
        const commentsContainer = document.getElementById('comments-container');
        if (!commentsContainer) {
            console.error('Comments container not found');
            return;
        }

        commentsContainer.innerHTML = `
            <div class="comments-section">
                <form class="comment-form" id="comment-form">
                    <div class="comment-form-header">Leave a Comment</div>
                    <div class="comment-input-group">
                        <label class="field-label" for="comment-author">Name</label>
                        <input type="text" class="comment-input" id="comment-author" name="author" required
                               placeholder="Your name" maxlength="50" autocomplete="name">
                    </div>
                        <div class="field-hint">Please enter your display name.</div>

                    <div class="comment-input-group">
                        <label class="field-label" for="comment-email">Email</label>
                        <input type="email" class="comment-input" id="comment-email" name="email" required
                               placeholder="Email (will not be published)" autocomplete="email">
                    </div>
                        <div class="field-hint">We’ll never share your email.</div>

                    <div class="comment-input-group">
                        <label class="field-label" for="comment-content">Comment</label>
                        <textarea class="comment-textarea" id="comment-content" name="content" required
                                  placeholder="Share your thoughts…"
                                  minlength="${this.config.minCommentLength}"
                                  maxlength="${this.config.maxCommentLength}"></textarea>
                    </div>
                        <div class="field-hint">Be respectful and constructive.</div>


                    <!-- Security fields -->
                    ${this.security.createHoneypotFields()}

                    <div class="comment-input-group">
                        <button type="submit" class="comment-submit-btn" style="padding:10px 18px;border-radius:22px;background:#0457a7;color:#fff;font-weight:700;">Post Comment</button>
                    </div>
                </form>

                <div id="comments-messages"></div>

                <div class="comments-sort">
                    <button class="sort-btn active" data-sort="newest">Newest</button>
                    <button class="sort-btn" data-sort="oldest">Oldest</button>
                    <button class="sort-btn" data-sort="popular">Popular</button>
                </div>

                <div id="comments-loading" class="comments-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Loading comments...</p>
                </div>

                <div class="comments-list" id="comments-list">
                    <!-- Comments will be loaded here -->
                </div>
            </div>
        `;
    }

    // Load comments from JSON file
    async loadComments() {
        try {
            this.showLoading(true);
            const response = await fetch(this.config.apiEndpoint + '?v=' + Date.now());

            if (!response.ok) {
                throw new Error('Failed to load comments');
            }

            const data = await response.json();
            this.comments = data[this.gameId] || [];

            this.updateCommentsCount();
            this.renderComments();
        } catch (error) {
            console.error('Error loading comments:', error);
            this.showMessage('Failed to load comments. Please refresh the page.', 'error');
        } finally {
            this.showLoading(false);
        }


    }

    // Bind event listeners
    bindEvents() {
        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setSortMode(e.target.dataset.sort);
            });
        });

        // Comment form submission
        const commentForm = document.getElementById('comment-form');
        commentForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCommentSubmission(e);
        });

        // Character counter for textarea
        const textarea = document.getElementById('comment-content');
        textarea?.addEventListener('input', this.updateCharacterCount.bind(this));
    }

    // Handle comment form submission
    async handleCommentSubmission(event) {
        if (this.isSubmitting) return;

        const formData = new FormData(event.target);
        const commentData = {
            author: formData.get('author')?.trim(),
            email: formData.get('email')?.trim(),
            content: formData.get('content')?.trim(),
            website: formData.get('website'), // Honeypot field
            confirm_human: formData.get('confirm_human'), // Hidden checkbox
            alt_email: formData.get('alt_email') // Hidden email field
        };

        try {
            this.isSubmitting = true;
            this.updateSubmitButton(true);

            // Comprehensive security validation
            const context = {
                ip: this.getUserIP(),
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            };

            const securityResult = await this.security.validateComment(commentData, context);

            if (!securityResult.isValid) {
                // Show first error message
                this.showMessage(securityResult.errors[0] || 'Comment validation failed.', 'error');
                return;
            }

            // Show warnings if any
            if (securityResult.warnings.length > 0) {
                securityResult.warnings.forEach(warning => {
                    this.showMessage(warning, 'warning');
                });
            }

            // Clean comment data (remove security fields)
            const cleanCommentData = {
                author: commentData.author,
                email: commentData.email,
                content: commentData.content
            };

            // Basic validation (still keep for backwards compatibility)
            if (!this.validateComment(cleanCommentData)) return;

            // Additional rate limiting check (backup)
            if (!this.checkRateLimit()) {
                this.showMessage('Please wait before posting another comment.', 'error');
                return;
            }

            const newComment = {
                id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                author: cleanCommentData.author,
                email: this.hashEmail(cleanCommentData.email), // Hash email for privacy
                content: cleanCommentData.content,
                timestamp: Date.now(),
                votes: { up: 0, down: 0 },
                replies: [],
                securityScore: securityResult.riskScore // For moderation purposes
            };

            // Submit to GitHub
            await this.submitCommentToGitHub(newComment);

            // Record successful submission for rate limiting
            this.security.rateLimiter.recordSubmission(context.ip);

            // Reset form and show success
            event.target.reset();
            const successMessage = securityResult.riskScore > 20 ?
                'Comment submitted and will be reviewed before publishing.' :
                'Comment submitted successfully! It will appear when the site updates.';
            this.showMessage(successMessage, 'success');
            this.setRateLimit();

        } catch (error) {
            console.error('Error submitting comment:', error);
            this.showMessage(error.message || 'Failed to submit comment. Please try again.', 'error');
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    // Validate comment data
    validateComment(commentData) {
        const { author, email, content } = commentData;

        if (!author || author.length < 2 || author.length > 50) {
            this.showMessage('Name must be between 2 and 50 characters.', 'error');
            return false;
        }

        if (!email || !this.isValidEmail(email)) {
            this.showMessage('Please enter a valid email address.', 'error');
            return false;
        }

        if (!content || content.length < this.config.minCommentLength ||
            content.length > this.config.maxCommentLength) {
            this.showMessage(`Comment must be between ${this.config.minCommentLength} and ${this.config.maxCommentLength} characters.`, 'error');
            return false;
        }

        // Basic spam detection
        if (this.containsSpam(content)) {
            this.showMessage('Comment contains inappropriate content.', 'error');
            return false;
        }

        return true;
    }

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Basic spam detection
    containsSpam(text) {
        const spamKeywords = ['spam', 'viagra', 'casino', 'win money', 'click here'];
        const lowerText = text.toLowerCase();
        return spamKeywords.some(keyword => lowerText.includes(keyword));
    }

    // Rate limiting
    checkRateLimit() {
        const lastComment = localStorage.getItem('lastCommentTime');
        if (!lastComment) return true;

        const timeSinceLastComment = Date.now() - parseInt(lastComment);
        return timeSinceLastComment >= this.config.rateLimit;
    }

    setRateLimit() {
        localStorage.setItem('lastCommentTime', Date.now().toString());
    }

    // Submit comment to GitHub (placeholder for GitHub API integration)
    async submitCommentToGitHub(commentData) {
        // This will be implemented in the next step
        // For now, just simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Comment to be submitted to GitHub:', commentData);
    }

    // Render comments list
    renderComments() {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        const sortedComments = this.getSortedComments();

        // Update comment count in header
        const countElement = document.getElementById('comments-count');
        if (countElement) {
            countElement.textContent = sortedComments.length;
        }

        if (sortedComments.length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments">
                    <div class="no-comments-icon">💬</div>
                    <p class="no-comments-text">No comments yet</p>
                    <p class="no-comments-subtext">Be the first to share your thoughts!</p>
                </div>
            `;
            return;
        }

        commentsList.innerHTML = sortedComments.map(comment =>
            this.renderComment(comment)
        ).join('');

        // Bind vote and reply events
        this.bindCommentEvents();
    }

    // Render individual comment
    renderComment(comment) {
        const timeAgo = this.timeAgo(comment.timestamp);
        const totalVotes = comment.votes.up - comment.votes.down;

        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-author">${this.escapeHtml(comment.author)}</div>
                <div class="comment-date">${timeAgo}</div>
                <div class="comment-content">${this.escapeHtml(comment.content)}</div>

                <div class="comment-actions">
                    <button class="comment-action-btn vote-up" data-comment-id="${comment.id}" data-vote="up">
                        👍 <span class="vote-count">${comment.votes.up}</span>
                    </button>
                    <button class="comment-action-btn vote-down" data-comment-id="${comment.id}" data-vote="down">
                        👎 <span class="vote-count">${comment.votes.down}</span>
                    </button>
                    <button class="comment-action-btn reply-btn" data-comment-id="${comment.id}">
                        💬 Reply
                    </button>
                </div>

                ${comment.replies && comment.replies.length > 0 ? `
                    <div class="replies">
                        ${comment.replies.map(reply => this.renderReply(reply)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Render reply
    renderReply(reply) {
        const timeAgo = this.timeAgo(reply.timestamp);

        return `
            <div class="comment-item reply-item" data-comment-id="${reply.id}" style="margin-left: 20px;">
                <div class="comment-author">↳ ${this.escapeHtml(reply.author)}</div>
                <div class="comment-date">${timeAgo}</div>
                <div class="comment-content">${this.escapeHtml(reply.content)}</div>
            </div>
        `;
    }

    // Bind comment-specific events
    bindCommentEvents() {
        // Vote buttons
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = e.target.dataset.commentId;
                const voteType = e.target.dataset.vote;
                this.handleVote(commentId, voteType);
            });
        });

        // Reply buttons
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = e.target.dataset.commentId;
                this.showReplyForm(commentId);
            });
        });
    }

    // Handle voting
    handleVote(commentId, voteType) {
        // Check if user has already voted
        const voteKey = `vote_${commentId}`;
        const existingVote = localStorage.getItem(voteKey);

        if (existingVote === voteType) {
            this.showMessage('You have already voted on this comment.', 'error');
            return;
        }

        // Find and update comment
        const comment = this.findComment(commentId);
        if (!comment) return;

        // Remove previous vote if exists
        if (existingVote) {
            comment.votes[existingVote]--;
        }

        // Add new vote
        comment.votes[voteType]++;
        localStorage.setItem(voteKey, voteType);

        // Re-render comments to reflect changes
        this.renderComments();
        this.showMessage('Vote recorded!', 'success');
    }

    // Show reply form
    showReplyForm(commentId) {
        const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentItem) return;

        // Remove any existing reply forms
        document.querySelectorAll('.reply-form').forEach(form => form.remove());

        const replyForm = document.createElement('div');
        replyForm.className = 'reply-form';
        replyForm.innerHTML = `
            <form class="reply-form-inner" data-parent-id="${commentId}">
                <div class="form-group">
                    <label>Quick Reply</label>
                    <textarea name="reply-content" placeholder="Write your reply..."
                              minlength="10" maxlength="500" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="cancel-reply">Cancel</button>
                    <button type="submit" class="submit-btn">Post Reply</button>
                </div>
            </form>
        `;

        commentItem.appendChild(replyForm);

        // Bind reply form events
        const form = replyForm.querySelector('form');
        form.addEventListener('submit', (e) => this.handleReplySubmission(e));

        const cancelBtn = replyForm.querySelector('.cancel-reply');
        cancelBtn.addEventListener('click', () => replyForm.remove());

        // Focus the textarea
        replyForm.querySelector('textarea').focus();
    }

    // Handle reply submission
    async handleReplySubmission(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const replyContent = formData.get('reply-content')?.trim();
        const parentId = event.target.dataset.parentId;

        if (!replyContent || replyContent.length < 10) {
            this.showMessage('Reply must be at least 10 characters long.', 'error');
            return;
        }

        // For now, just show a message that reply functionality needs login
        this.showMessage('Reply functionality requires user authentication. Coming soon!', 'error');
        event.target.closest('.reply-form').remove();
    }

    // Utility functions
    getSortedComments() {
        const sorted = [...this.comments];

        switch (this.currentSort) {
            case 'oldest':
                return sorted.sort((a, b) => a.timestamp - b.timestamp);
            case 'popular':
                return sorted.sort((a, b) => (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down));
            case 'newest':
            default:
                return sorted.sort((a, b) => b.timestamp - a.timestamp);
        }
    }

    setSortMode(sortMode) {
        this.currentSort = sortMode;

        // Update active button
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortMode);
        });

        this.renderComments();
    }

    findComment(commentId) {
        return this.comments.find(comment => comment.id === commentId);
    }

    updateCommentsCount() {
        const countElement = document.querySelector('.comments-count');
        if (countElement) {
            const totalComments = this.comments.length +
                this.comments.reduce((acc, comment) => acc + (comment.replies?.length || 0), 0);
            countElement.textContent = `${totalComments} Comment${totalComments !== 1 ? 's' : ''}`;
        }
    }

    showLoading(show) {
        const loadingElement = document.getElementById('comments-loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    showMessage(message, type = 'info') {
        const messagesContainer = document.getElementById('comments-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `${type}-message`;
        messageElement.textContent = message;

        messagesContainer.appendChild(messageElement);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }

    updateSubmitButton(isLoading) {
        const submitBtn = document.querySelector('.comment-form .submit-btn');
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? 'Posting...' : 'Post Comment';
        }
    }

    updateCharacterCount() {
        const textarea = document.getElementById('comment-content');
        const maxLength = this.config.maxCommentLength;
        const currentLength = textarea.value.length;

        // Create or update character counter
        let counter = document.getElementById('character-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'character-counter';
            counter.style.textAlign = 'right';
            counter.style.fontSize = '12px';
            counter.style.color = '#666';
            textarea.parentNode.appendChild(counter);
        }

        counter.textContent = `${currentLength}/${maxLength}`;
        counter.style.color = currentLength > maxLength * 0.9 ? '#c53030' : '#666';
    }

    timeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get user IP address (simplified - in production use server-side)
    getUserIP() {
        // This is a simplified approach - in production, you'd get the IP server-side
        // For client-side, we'll use a fallback identifier
        return localStorage.getItem('user_identifier') ||
               `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Hash email for privacy (simple hash - in production use proper hashing)
    hashEmail(email) {
        if (!email) return null;

        // Simple hash for privacy - in production use bcrypt or similar
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `user_${Math.abs(hash).toString(36)}`;
    }
}

// Auto-initialize comments system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get game ID from page URL or data attribute
    const gameId = getGameIdFromPage();

    if (gameId && document.getElementById('comments-container')) {
        // Initialize comments system
        window.commentsSystem = new CommentsSystem(gameId, {
            // Configuration can be passed here
            githubRepo: 'melooooooo/bloodmoneygame',
            // Worker API will handle authentication securely
        });
    }
});

// Helper function to get game ID from current page
function getGameIdFromPage() {
    // Extract game ID from URL
    const path = window.location.pathname;
    const filename = path.split('/').pop();

    // Map filenames to game IDs
    const gameMapping = {
        'index.html': 'bloodmoney',
        '': 'bloodmoney',
        '/': 'bloodmoney',
        'bloodmoney-2.html': 'bloodmoney-2',
        'bloodmoney-unblocked.html': 'bloodmoney-unblocked',
        'the-baby-in-yellow.html': 'the-baby-in-yellow',
        'buckshot-roulette.html': 'buckshot-roulette',
        'scary-teacher-3d.html': 'scary-teacher-3d',
        'granny-horror.html': 'granny-horror',
        'thats-not-my-neighbor.html': 'thats-not-my-neighbor',
        'we-become-what-we-behold.html': 'we-become-what-we-behold',
        'do-not-take-this-cat-home.html': 'do-not-take-this-cat-home',
        'italian-brainrot-clicker.html': 'italian-brainrot-clicker'
    };

    return gameMapping[filename] || gameMapping[path] || 'bloodmoney';
}