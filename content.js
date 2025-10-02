// Content script for GitHub/GitLab PR pages

let aiButton = null;
let isAnalyzing = false;

// Initialize the extension on PR pages
function init() {
  // Check if we're on a PR page
  const isGitHub = window.location.hostname === 'github.com' && window.location.pathname.includes('/pull/');
  const isGitLab = window.location.hostname === 'gitlab.com' && window.location.pathname.includes('/-/merge_requests/');

  if (isGitHub || isGitLab) {
    checkAIAvailability();
    injectAIButton();
  }
}

// Check if Chrome AI APIs are available
async function checkAIAvailability() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });

    if (!response.ready) {
      showNotification('CodeReview AI requires Chrome 138+ with AI features enabled', 'warning');
    }
  } catch (error) {
    // Silent fail
  }
}

// Inject "AI Review" button into PR page
function injectAIButton() {
  const isGitHub = window.location.hostname === 'github.com';

  // Find appropriate location for button
  let targetElement;
  if (isGitHub) {
    // GitHub: Add to discussion header actions
    targetElement = document.querySelector('.gh-header-actions') ||
                   document.querySelector('[data-hpc] > div');
  } else {
    // GitLab: Add to merge request actions
    targetElement = document.querySelector('.detail-page-header-actions') ||
                   document.querySelector('.merge-request-actions');
  }

  if (!targetElement) {
    // Try again after delay
    setTimeout(injectAIButton, 2000);
    return;
  }

  // Check if button already exists
  if (document.getElementById('codereview-ai-button')) {
    return;
  }

  // Create AI Review button
  aiButton = document.createElement('button');
  aiButton.id = 'codereview-ai-button';
  aiButton.className = isGitHub ? 'btn btn-sm' : 'btn btn-default btn-sm';
  aiButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px; vertical-align: text-bottom;">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
    <span>AI Review</span>
  `;
  aiButton.style.cssText = 'margin-left: 8px; cursor: pointer;';
  aiButton.addEventListener('click', handleAIReview);

  targetElement.insertBefore(aiButton, targetElement.firstChild);
}

// Handle AI Review button click
async function handleAIReview() {
  if (isAnalyzing) {
    return;
  }

  isAnalyzing = true;
  updateButtonState('analyzing');

  try {
    // Extract PR data
    const prData = extractPRData();

    if (!prData.diff) {
      showNotification('No code changes found to review', 'error');
      updateButtonState('idle');
      isAnalyzing = false;
      return;
    }

    // Open side panel for results
    try {
      chrome.runtime.sendMessage({ action: 'openSidePanel' });
    } catch (e) {
      // Silent fail
    }

    // Send to background script for AI analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzePR',
      data: prData
    });

    if (response && response.success) {
      // Store results and PR data for sidebar and Q&A
      chrome.storage.local.set({
        latestReview: response.results,
        currentPRData: prData,
        qaHistory: [] // Reset Q&A history for new review
      });
      showNotification('AI review complete! Check the side panel', 'success');
    } else if (response && (response.error || response.results?.error)) {
      // Get error from either location
      const errorMsg = response.error || response.results.error;

      // Check if it's a download message
      if (errorMsg.includes('downloading')) {
        showNotification('AI model is downloading (5-10 min). Check side panel for details.', 'info');
        // Store the download message in sidebar
        chrome.storage.local.set({ latestReview: response.results });
      } else {
        showNotification(`Analysis failed: ${errorMsg}`, 'error');
      }
    } else {
      showNotification('No response from AI. Extension may need to be reloaded.', 'error');
    }

  } catch (error) {
    // Check if it's an extension context error
    if (error.message && error.message.includes('Extension context invalidated')) {
      showNotification('Extension was reloaded. Please refresh this page and try again.', 'error');
    } else if (error.message && error.message.includes('message port closed')) {
      showNotification('Connection lost. Please reload the extension and refresh this page.', 'error');
    } else {
      showNotification(`AI review failed: ${error.message || 'Unknown error'}`, 'error');
    }
  } finally {
    updateButtonState('idle');
    isAnalyzing = false;
  }
}

// Extract PR data from the page
function extractPRData() {
  const isGitHub = window.location.hostname === 'github.com';

  let title = '';
  let description = '';
  let diff = '';

  if (isGitHub) {
    // GitHub extraction
    title = document.querySelector('.js-issue-title')?.textContent.trim() || '';
    description = document.querySelector('.comment-body')?.textContent.trim() || '';

    // Get diff from Files changed tab
    const diffElements = document.querySelectorAll('.blob-code-addition, .blob-code-deletion');
    diff = Array.from(diffElements).map(el => el.textContent).join('\n').slice(0, 10000); // Limit size

    // If no diff in current view, try to get from API or indicate need to switch tabs
    if (!diff) {
      diff = 'Please navigate to the "Files changed" tab to review code.';
    }
  } else {
    // GitLab extraction
    title = document.querySelector('.merge-request-title')?.textContent.trim() || '';
    description = document.querySelector('.description')?.textContent.trim() || '';

    const diffElements = document.querySelectorAll('.line_content.new, .line_content.old');
    diff = Array.from(diffElements).map(el => el.textContent).join('\n').slice(0, 10000);

    if (!diff) {
      diff = 'Please navigate to the "Changes" tab to review code.';
    }
  }

  return { title, description, diff };
}

// Update button visual state
function updateButtonState(state) {
  if (!aiButton) return;

  const span = aiButton.querySelector('span');
  if (state === 'analyzing') {
    span.textContent = 'Analyzing...';
    aiButton.disabled = true;
    aiButton.style.opacity = '0.6';
  } else {
    span.textContent = 'AI Review';
    aiButton.disabled = false;
    aiButton.style.opacity = '1';
  }
}

// Show notification to user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `codereview-ai-notification codereview-ai-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
  `;

  document.body.appendChild(notification);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-initialize on navigation (for SPAs like GitHub)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1000); // Delay to let page load
  }
}).observe(document, { subtree: true, childList: true });
