// Sidebar script for displaying AI review results

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const apiStatus = document.getElementById('apiStatus');
const content = document.getElementById('content');

// Q&A elements
const qaSection = document.getElementById('qaSection');
const qaHeader = document.getElementById('qaHeader');
const qaToggle = document.getElementById('qaToggle');
const qaContent = document.getElementById('qaContent');
const qaThread = document.getElementById('qaThread');
const qaTextarea = document.getElementById('qaTextarea');
const qaCharCount = document.getElementById('qaCharCount');
const qaButton = document.getElementById('qaButton');

// Store current PR data and conversation
let currentPRData = null;
let currentReview = null;
let qaHistory = [];

// Check AI API availability on load
checkAPIStatus();

// Listen for review updates
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.latestReview) {
    displayReview(changes.latestReview.newValue);
  }
  if (changes.currentPRData) {
    currentPRData = changes.currentPRData.newValue;
  }
  if (changes.qaHistory) {
    qaHistory = changes.qaHistory.newValue || [];
    renderQAHistory();
  }
});

// Load existing review and PR data if available
chrome.storage.local.get(['latestReview', 'currentPRData', 'qaHistory'], (result) => {
  if (result.latestReview) {
    displayReview(result.latestReview);
  }
  if (result.currentPRData) {
    currentPRData = result.currentPRData;
  }
  if (result.qaHistory) {
    qaHistory = result.qaHistory || [];
    renderQAHistory();
  }
});

// Q&A Event Listeners
qaHeader.addEventListener('click', toggleQASection);
qaTextarea.addEventListener('input', updateCharCount);
qaButton.addEventListener('click', askQuestion);
qaTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    askQuestion();
  }
});

async function checkAPIStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });

    let statusHTML = '';

    // Prompt API status
    if (response.promptAPI === 'available') {
      statusHTML += '<span style="color: #28a745;">✓ Prompt API</span> ';
    } else if (response.promptAPI === 'downloadable') {
      statusHTML += '<span style="color: #ffc107;">⏳ Prompt API (ready to download)</span> ';
    } else if (response.promptAPI === 'downloading') {
      statusHTML += '<span style="color: #ffc107;">⏳ Prompt API (downloading...)</span> ';
    } else {
      statusHTML += '<span style="color: #dc3545;">✗ Prompt API (unavailable)</span> ';
    }

    // Summarizer API status
    if (response.summarizerAPI === 'available') {
      statusHTML += '<span style="color: #28a745;">✓ Summarizer API</span>';
    } else if (response.summarizerAPI === 'downloadable') {
      statusHTML += '<span style="color: #ffc107;">⏳ Summarizer API (ready to download)</span>';
    } else if (response.summarizerAPI === 'downloading') {
      statusHTML += '<span style="color: #ffc107;">⏳ Summarizer API (downloading...)</span>';
    } else {
      statusHTML += '<span style="color: #dc3545;">✗ Summarizer API (unavailable)</span>';
    }

    apiStatus.innerHTML = statusHTML;

    // Show helpful message based on status
    if (response.downloading) {
      // Don't show error if downloading
    } else if (!response.ready && response.error) {
      showError(response.error);
    }
  } catch (error) {
    apiStatus.innerHTML = '<span style="color: #dc3545;">Unable to check AI API status</span>';
  }
}

function displayReview(results) {
  // Check for loading state
  if (results.loading) {
    showLoading();
    return;
  }

  if (results.error) {
    // Check if it's a download message
    if (results.error.includes('downloading')) {
      showDownloadMessage(results.error);
    } else {
      showError(results.error);
    }
    return;
  }

  statusDot.classList.remove('loading', 'error');
  statusText.textContent = 'Review Complete';

  // Store current review for Q&A context
  currentReview = results;

  let html = '';

  // Display Summary
  if (results.summary) {
    html += `
      <div class="section">
        <h2>📝 Summary</h2>
        <div class="section-content">${escapeHtml(results.summary)}</div>
      </div>
    `;
  }

  // Display Code Review
  if (results.codeReview) {
    html += `
      <div class="section">
        <h2>🔍 AI Code Review</h2>
        <div class="section-content">${formatCodeReview(results.codeReview)}</div>
      </div>
    `;
  }

  if (!html) {
    html = `
      <div class="empty-state">
        <h3>No results available</h3>
        <p>The AI analysis did not return any results. Please try again.</p>
      </div>
    `;
  }

  content.innerHTML = html;

  // Show Q&A section after successful review
  if (results.codeReview) {
    qaSection.style.display = 'block';
  }
}

function formatCodeReview(reviewText) {
  // Escape HTML first
  const escaped = escapeHtml(reviewText);

  // Format markdown-style elements
  let formatted = escaped
    // Code blocks (```...```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; border: 1px solid #d0d7de;"><code>$2</code></pre>')
    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code style="background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-size: 85%; font-family: ui-monospace, monospace;">$1</code>')
    // Headers (## Header -> <h3>)
    .replace(/^## (.+)$/gm, '<h3 style="font-size: 15px; font-weight: 600; margin: 16px 0 8px 0; color: #24292f; border-bottom: 1px solid #d0d7de; padding-bottom: 4px;">$1</h3>')
    // Bold text (**text** -> <strong>)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600; color: #24292f;">$1</strong>')
    // Italic text (_text_ or *text*)
    .replace(/\b_(.+?)_\b/g, '<em>$1</em>')
    .replace(/\b\*(.+?)\*\b/g, '<em>$1</em>')
    // Numbered lists (1., 2., etc.)
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li style="margin-left: 20px; margin-bottom: 6px; list-style-type: decimal;">$2</li>')
    // Bullet points with proper indentation (avoid matching asterisks in bold)
    .replace(/^[•\-]\s+(.+)$/gm, '<li style="margin-left: 20px; margin-bottom: 6px;">$1</li>')
    // Checkmarks
    .replace(/✅/g, '<span style="color: #28a745; font-weight: 600;">✅</span>')
    // Warning/alert symbols
    .replace(/⚠️/g, '<span style="color: #bf8700;">⚠️</span>')
    .replace(/❌/g, '<span style="color: #cf222e;">❌</span>');

  // Wrap consecutive numbered <li> elements in <ol>
  formatted = formatted.replace(/(<li[^>]*list-style-type: decimal;[^>]*>.*?<\/li>\s*)+/gs, '<ol style="padding-left: 20px; margin: 8px 0;">$&</ol>');

  // Wrap consecutive bullet <li> elements in <ul>
  formatted = formatted.replace(/(<li(?![^>]*list-style-type)[^>]*>.*?<\/li>\s*)+/gs, '<ul style="list-style: disc; padding-left: 20px; margin: 8px 0;">$&</ul>');

  // Add proper spacing after headers
  formatted = formatted.replace(/<\/h3>\s*<br>/g, '</h3>');

  // Add tags for common keywords (after markdown formatting, avoid matching inside code blocks)
  formatted = formatted
    .replace(/\b(bug|bugs|error|errors|issue|issues)\b/gi, (match, p1, offset, string) => {
      // Don't replace if inside code or pre tags
      const before = string.substring(0, offset);
      if (before.lastIndexOf('<code') > before.lastIndexOf('</code>') ||
          before.lastIndexOf('<pre') > before.lastIndexOf('</pre>')) {
        return match;
      }
      return '<span class="tag bug">' + match + '</span>';
    })
    .replace(/\b(security|vulnerability|vulnerabilities)\b/gi, (match, p1, offset, string) => {
      const before = string.substring(0, offset);
      if (before.lastIndexOf('<code') > before.lastIndexOf('</code>') ||
          before.lastIndexOf('<pre') > before.lastIndexOf('</pre>')) {
        return match;
      }
      return '<span class="tag security">' + match + '</span>';
    })
    .replace(/\b(performance|optimization|optimize)\b/gi, (match, p1, offset, string) => {
      const before = string.substring(0, offset);
      if (before.lastIndexOf('<code') > before.lastIndexOf('</code>') ||
          before.lastIndexOf('<pre') > before.lastIndexOf('</pre>')) {
        return match;
      }
      return '<span class="tag performance">' + match + '</span>';
    });

  return formatted;
}

function showDownloadMessage(message) {
  statusDot.classList.add('loading');
  statusDot.classList.remove('error');
  statusText.textContent = 'Downloading AI Model...';

  content.innerHTML = `
    <div class="section" style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); border-left: 4px solid #ffc107; padding: 16px;">
      <h2 style="font-size: 15px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#856404">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
          <circle cx="8" cy="8" r="2" fill="#856404"/>
        </svg>
        First-Time Setup
      </h2>

      <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
        <p style="font-size: 13px; margin: 0 0 6px 0; color: #333; font-weight: 500;">
          AI model is downloading (5-10 minutes)
        </p>
        <p style="font-size: 12px; margin: 0; color: #666; line-height: 1.4;">
          The AI model (~3GB) is being downloaded to your device. This is a one-time process.
        </p>
      </div>

      <div style="font-size: 12px; color: #856404; line-height: 1.6;">
        <div style="display: flex; align-items: start; gap: 6px; margin-bottom: 4px;">
          <span style="flex-shrink: 0;">✓</span>
          <span>Download runs in background</span>
        </div>
        <div style="display: flex; align-items: start; gap: 6px; margin-bottom: 4px;">
          <span style="flex-shrink: 0;">✓</span>
          <span>Safe to close this tab</span>
        </div>
        <div style="display: flex; align-items: start; gap: 6px;">
          <span style="flex-shrink: 0;">✓</span>
          <span>Auto-checking status every 30 seconds</span>
        </div>
      </div>

      <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.7); border-radius: 4px; font-size: 11px;">
        <strong style="color: #856404;">Manual check:</strong>
        <code style="background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 4px;">
          LanguageModel.availability()
        </code>
      </div>
    </div>
  `;

  // Auto-refresh status every 30 seconds
  const checkInterval = setInterval(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });
      if (response.promptAPI === 'available') {
        clearInterval(checkInterval);
        content.innerHTML = `
          <div class="section" style="background: #d4edda; border-left: 4px solid #28a745;">
            <h2>✅ Download Complete!</h2>
            <div class="section-content">
              <p style="font-size: 14px; color: #155724;">
                The AI model is now ready. Click the "AI Review" button again to analyze the pull request!
              </p>
            </div>
          </div>
        `;
        statusDot.classList.remove('loading');
        statusText.textContent = 'Ready';
      }
    } catch (e) {
      // Silent fail
    }
  }, 30000);
}

function showError(message) {
  statusDot.classList.add('error');
  statusDot.classList.remove('loading');
  statusText.textContent = 'Error';

  content.innerHTML = `
    <div class="error-message">
      <strong>Error:</strong> ${escapeHtml(message)}
    </div>
    <div class="empty-state">
      <p>Please try again or check the console for more details.</p>
    </div>
  `;
}

function showLoading() {
  statusDot.classList.add('loading');
  statusDot.classList.remove('error');
  statusText.textContent = 'Analyzing...';

  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>AI is analyzing the pull request...</p>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Q&A Functions
function toggleQASection() {
  qaContent.classList.toggle('hidden');
  qaToggle.classList.toggle('collapsed');
}

function updateCharCount() {
  const length = qaTextarea.value.length;
  qaCharCount.textContent = `${length} / 500`;
  if (length > 500) {
    qaCharCount.classList.add('over-limit');
  } else {
    qaCharCount.classList.remove('over-limit');
  }
}

async function askQuestion() {
  const question = qaTextarea.value.trim();

  if (!question || question.length === 0) {
    return;
  }

  if (question.length > 500) {
    showError('Question is too long. Please keep it under 500 characters.');
    return;
  }

  if (!currentPRData || !currentReview) {
    showError('No PR data available. Please run a review first.');
    return;
  }

  // Disable input while processing
  qaTextarea.disabled = true;
  qaButton.disabled = true;

  // Show loading indicator
  const loadingId = showQALoading();

  try {
    // Send question to background script
    const response = await chrome.runtime.sendMessage({
      action: 'askQuestion',
      data: {
        question: question,
        prData: currentPRData,
        review: currentReview.codeReview,
        history: qaHistory.slice(-3) // Last 3 Q&As for context
      }
    });

    // Remove loading indicator
    removeQALoading(loadingId);

    if (response && response.success) {
      // Add to history
      qaHistory.push({
        question: question,
        answer: response.answer,
        timestamp: Date.now()
      });

      // Save to storage
      chrome.storage.local.set({ qaHistory: qaHistory });

      // Render new Q&A
      renderQAHistory();

      // Clear textarea
      qaTextarea.value = '';
      updateCharCount();

      // Scroll to bottom
      qaThread.scrollTop = qaThread.scrollHeight;
    } else {
      showError(response?.error || 'Failed to get answer from AI');
    }
  } catch (error) {
    removeQALoading(loadingId);
    showError(`Error: ${error.message}`);
  } finally {
    qaTextarea.disabled = false;
    qaButton.disabled = false;
    qaTextarea.focus();
  }
}

function renderQAHistory() {
  if (!qaHistory || qaHistory.length === 0) {
    qaThread.innerHTML = `
      <div class="qa-empty-state">
        Ask questions about the code review, security concerns, performance issues, or implementation details.
      </div>
    `;
    return;
  }

  let html = '';
  qaHistory.forEach((qa) => {
    html += `
      <div class="qa-message qa-question">
        <div class="qa-question-label">Question</div>
        <div class="qa-question-text">${escapeHtml(qa.question)}</div>
      </div>
      <div class="qa-message qa-answer">
        <div class="qa-answer-label">AI Answer</div>
        <div class="qa-answer-text">${formatCodeReview(qa.answer)}</div>
      </div>
    `;
  });

  qaThread.innerHTML = html;
}

function showQALoading() {
  const loadingId = `qa-loading-${Date.now()}`;
  const loadingHTML = `
    <div class="qa-loading" id="${loadingId}">
      <div class="qa-spinner"></div>
      <span>AI is thinking...</span>
    </div>
  `;
  qaThread.insertAdjacentHTML('beforeend', loadingHTML);
  qaThread.scrollTop = qaThread.scrollHeight;
  return loadingId;
}

function removeQALoading(loadingId) {
  const loadingEl = document.getElementById(loadingId);
  if (loadingEl) {
    loadingEl.remove();
  }
}

// Export for potential use
window.showLoading = showLoading;
window.displayReview = displayReview;
window.showError = showError;
