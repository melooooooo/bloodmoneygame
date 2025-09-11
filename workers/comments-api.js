/**
 * Cloudflare Worker for BloodMoney Comments API
 * Handles secure GitHub API interactions for comment submission
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://bloodmoney.ink',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    try {
      // Route handling
      switch (url.pathname) {
        case '/api/comments':
          if (request.method === 'GET') {
            return await handleGetComments(env, corsHeaders);
          } else if (request.method === 'POST') {
            return await handlePostComment(request, env, corsHeaders);
          }
          break;
          
        case '/api/health':
          return new Response(JSON.stringify({ status: 'healthy' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
          
        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Handle GET requests for comments
 */
async function handleGetComments(env, corsHeaders) {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/comments.json`;
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BloodMoney-Comments-Worker'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = JSON.parse(atob(data.content));
    
    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle POST requests to submit new comments
 */
async function handlePostComment(request, env, corsHeaders) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env;
  
  if (!GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Parse request body
    const body = await request.json();
    const { gameId, comment } = body;
    
    // Validate input
    if (!gameId || !comment) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate comment structure
    if (!comment.author || !comment.content) {
      return new Response(JSON.stringify({ error: 'Invalid comment data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Rate limiting check (basic implementation)
    const clientIP = request.headers.get('CF-Connecting-IP');
    const rateLimitKey = `ratelimit:${clientIP}:${gameId}`;
    const lastSubmission = await env.COMMENTS_KV?.get(rateLimitKey);
    
    if (lastSubmission) {
      const timeSince = Date.now() - parseInt(lastSubmission);
      if (timeSince < 60000) { // 1 minute rate limit
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait before posting another comment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Get current file content
    const fileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/comments.json`;
    
    const getResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BloodMoney-Comments-Worker'
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get current file: ${getResponse.status}`);
    }
    
    const fileData = await getResponse.json();
    const currentContent = JSON.parse(atob(fileData.content));
    const sha = fileData.sha;
    
    // Add new comment
    if (!currentContent[gameId]) {
      currentContent[gameId] = [];
    }
    
    // Add timestamp and ID if not present
    comment.id = comment.id || `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    comment.timestamp = comment.timestamp || Date.now();
    comment.votes = comment.votes || { up: 0, down: 0 };
    comment.replies = comment.replies || [];
    
    currentContent[gameId].unshift(comment);
    
    // Limit comments per game (keep last 100)
    if (currentContent[gameId].length > 100) {
      currentContent[gameId] = currentContent[gameId].slice(0, 100);
    }
    
    // Update file on GitHub
    const updateBody = {
      message: `Add comment from ${comment.author} on ${gameId}`,
      content: btoa(JSON.stringify(currentContent, null, 2)),
      sha: sha,
      branch: GITHUB_BRANCH || 'main'
    };
    
    const updateResponse = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'BloodMoney-Comments-Worker'
      },
      body: JSON.stringify(updateBody)
    });
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      throw new Error(`Failed to update file: ${updateResponse.status} - ${errorData}`);
    }
    
    // Update rate limit
    if (env.COMMENTS_KV) {
      await env.COMMENTS_KV.put(rateLimitKey, Date.now().toString(), { 
        expirationTtl: 60 // Expire after 1 minute
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      comment: comment,
      message: 'Comment submitted successfully!' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error submitting comment:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to submit comment',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Validate comment content for spam/malicious content
 */
function validateComment(comment) {
  // Basic spam keywords check
  const spamKeywords = ['viagra', 'casino', 'lottery', 'winner', 'click here'];
  const lowerContent = comment.content.toLowerCase();
  
  for (const keyword of spamKeywords) {
    if (lowerContent.includes(keyword)) {
      return { valid: false, reason: 'Spam detected' };
    }
  }
  
  // Check for excessive links
  const linkCount = (comment.content.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) {
    return { valid: false, reason: 'Too many links' };
  }
  
  // Check content length
  if (comment.content.length < 10 || comment.content.length > 1000) {
    return { valid: false, reason: 'Comment length invalid' };
  }
  
  return { valid: true };
}