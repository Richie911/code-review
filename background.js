// Service worker for CodeReview AI

// Keep service worker alive
let keepAliveInterval;

function startKeepAlive() {
  // Clear any existing interval
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  // Keep service worker alive by doing a lightweight task every 20 seconds
  keepAliveInterval = setInterval(() => {
    chrome.storage.local.get('keepalive', () => {
      // This just prevents the service worker from being terminated
    });
  }, 20000);
}

// Start keep-alive on load
startKeepAlive();

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  startKeepAlive();
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePR') {
    handlePRAnalysis(request.data, sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'askQuestion') {
    handleQuestionAnswer(request.data, sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
});

// Main PR analysis function using Chrome AI APIs
async function handlePRAnalysis(prData, sendResponse) {
  try {
    const results = {
      summary: null,
      codeReview: null,
      error: null
    };

    // Check if AI APIs are available (try both patterns)
    const hasAI = typeof ai !== 'undefined';
    const hasLanguageModel = typeof LanguageModel !== 'undefined';

    if (!hasAI && !hasLanguageModel) {
      throw new Error('Chrome AI APIs not available. Please enable chrome://flags/#prompt-api-for-gemini-nano-multimodal-input');
    }

    // Use LanguageModel global if available, fallback to ai.languageModel
    const languageModelAPI = hasLanguageModel ? LanguageModel : ai.languageModel;

    // Check Prompt API availability
    const promptAvailability = await languageModelAPI.availability();

    if (promptAvailability === 'available' || promptAvailability === 'downloadable') {
      // If downloadable, warn user about download time
      if (promptAvailability === 'downloadable') {
        results.error = 'AI model is downloading for the first time. This may take 5-10 minutes. Please check back later.';

        // Try to trigger download in background
        try {
          languageModelAPI.create().then(session => {
            session.destroy();
          }).catch(err => {
            // Silent fail
          });
        } catch (e) {
          // Silent fail
        }

        // Don't wait for download, return early
        sendResponse({ success: false, results });
        return;
      }

      // Create AI session for code review (only if already available)
      const session = await languageModelAPI.create();

      // Analyze the code changes
      const reviewPrompt = `You are an **expert code reviewer** with deep understanding of software development principles across various languages (Python, JavaScript, Java, Go, C++, Rust, TypeScript). Your task is to perform a thorough, professional analysis of the provided Pull Request changes.

Your analysis must be **constructive, specific, and actionable**. For any identified issue, clearly state the problem, explain *why* it matters, and suggest a concrete solution or alternative approach.

**Review Context:**
**Title:** ${prData.title}
**Description:** ${prData.description || 'No description provided'}

**Code Changes (Unified Diff Format):**
${prData.diff}

---

**Provide your feedback in the following structured format using markdown:**

## 1. Overall Assessment
*Summarize the quality and readiness of this PR in 2-3 concise sentences. Consider: code quality, testing coverage, adherence to requirements, and deployment readiness.*

## 2. Critical Issues (Blockers)
*Issues that MUST be fixed before merging:*
- Runtime errors or crashes
- Data corruption risks
- Critical security vulnerabilities
- Breaking changes without migration path

## 3. Potential Bugs and Logic Errors
*Identify specific issues with:*
- Edge case handling (null/undefined, empty arrays, boundary conditions)
- Error handling and recovery mechanisms
- Race conditions or concurrency issues
- Incorrect algorithm implementation
- Off-by-one errors or incorrect loop bounds

## 4. Security Concerns
*Highlight vulnerabilities such as:*
- Injection attacks (SQL, XSS, Command Injection, Path Traversal)
- Authentication/authorization bypass
- Insecure data handling (API keys, passwords, PII)
- Cryptographic weaknesses
- Dependency vulnerabilities
- CORS/CSRF issues
- Input validation gaps

## 5. Performance and Scalability
*Analyze:*
- Algorithm complexity (highlight O(n²) where O(n) is possible)
- Database query optimization (N+1 queries, missing indexes)
- Memory leaks or excessive allocations
- Inefficient data structures
- Blocking I/O operations
- Caching opportunities
- Potential bottlenecks under load

## 6. Code Quality and Maintainability
*Provide suggestions for:*
- **Readability:** Complex logic that needs simplification, unclear variable names
- **Best Practices:** Adherence to language idioms, SOLID principles, DRY violations
- **Documentation:** Missing comments for complex logic, outdated docs
- **Testing:** Missing test cases, insufficient coverage, brittle tests
- **Error Messages:** User-friendly error messages, proper logging
- **Code Duplication:** Opportunities for refactoring

## 7. Architecture and Design
*Consider:*
- Separation of concerns
- Abstraction levels and modularity
- Dependency management
- API design (RESTful practices, versioning)
- Database schema design
- Scalability patterns

## 8. Nitpicks and Style Suggestions
*Minor improvements that would enhance code quality:*
- Formatting inconsistencies
- Naming conventions
- Minor refactoring opportunities

## 9. Positive Observations
*Highlight what was done well:*
- Good practices worth noting
- Clever solutions
- Excellent test coverage
- Clear documentation

**Tone:** Professional, objective, and helpful. Focus on the code, not the developer. Use specific line references when possible.`;

      results.codeReview = await session.prompt(reviewPrompt);
      session.destroy();
    } else if (promptAvailability === 'downloading') {
      results.error = 'AI model is downloading. This may take 5-10 minutes. Please wait and try again.';
    } else {
      results.error = `AI not ready. Status: ${promptAvailability}`;
    }

    // Check Summarizer API availability
    const summarizerAPI = typeof Summarizer !== 'undefined' ? Summarizer : (hasAI ? ai.summarizer : null);

    if (summarizerAPI) {
      const summarizerAvailability = await summarizerAPI.availability();

      if (summarizerAvailability === 'available' || summarizerAvailability === 'downloadable') {
        // Create summarizer for PR overview
        const summarizer = await summarizerAPI.create({
          type: 'key-points',
          format: 'markdown',
          length: 'short'
        });

        const summaryText = `${prData.title}\n\n${prData.description}\n\nChanges:\n${prData.diff}`;
        results.summary = await summarizer.summarize(summaryText);
        summarizer.destroy();
      }
    }

    sendResponse({ success: true, results });
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message,
      results: { error: error.message }
    });
  }
}

// Handle Q&A about the PR review
async function handleQuestionAnswer(data, sendResponse) {
  try {
    const { question, prData, review, history } = data;

    // Check if AI APIs are available
    const hasAI = typeof ai !== 'undefined';
    const hasLanguageModel = typeof LanguageModel !== 'undefined';

    if (!hasAI && !hasLanguageModel) {
      throw new Error('Chrome AI APIs not available');
    }

    const languageModelAPI = hasLanguageModel ? LanguageModel : ai.languageModel;
    const promptAvailability = await languageModelAPI.availability();

    if (promptAvailability !== 'available') {
      throw new Error(`AI not ready. Status: ${promptAvailability}`);
    }

    // Build context-aware prompt
    let contextPrompt = `You are an expert code reviewer assistant. You previously reviewed a pull request and now the developer has a follow-up question.

**Original PR Context:**
Title: ${prData.title}
Description: ${prData.description || 'No description'}

**Your Previous Review Summary:**
${review ? review.substring(0, 1500) : 'No review available'}

`;

    // Add conversation history for context
    if (history && history.length > 0) {
      contextPrompt += `**Recent Conversation:**\n`;
      history.forEach((qa, idx) => {
        contextPrompt += `Q${idx + 1}: ${qa.question}\nA${idx + 1}: ${qa.answer.substring(0, 300)}\n\n`;
      });
    }

    contextPrompt += `**Current Question:**
${question}

**Instructions:**
Provide a clear, helpful, and actionable answer. If the question relates to fixing an issue:
- Explain the problem concisely
- Provide specific code examples when applicable
- Suggest best practices
- Keep the answer focused and under 300 words

Your answer:`;

    // Create AI session and get answer
    const session = await languageModelAPI.create();
    const answer = await session.prompt(contextPrompt);
    session.destroy();

    sendResponse({ success: true, answer: answer });

  } catch (error) {
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Handle API availability checks
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkAIAvailability') {
    checkAIAPIs().then(sendResponse);
    return true;
  }
});

async function checkAIAPIs() {
  try {
    // Check if AI APIs are available (try both patterns)
    const hasAI = typeof ai !== 'undefined';
    const hasLanguageModel = typeof LanguageModel !== 'undefined';
    const hasSummarizer = typeof Summarizer !== 'undefined';

    if (!hasAI && !hasLanguageModel) {
      return {
        promptAPI: 'unavailable',
        summarizerAPI: 'unavailable',
        ready: false,
        error: 'Chrome AI APIs not available. Please enable chrome://flags/#prompt-api-for-gemini-nano-multimodal-input and relaunch Chrome.'
      };
    }

    // Use global APIs if available, fallback to ai namespace
    const languageModelAPI = hasLanguageModel ? LanguageModel : ai.languageModel;
    const summarizerAPI = hasSummarizer ? Summarizer : (hasAI ? ai.summarizer : null);

    const promptAvailable = await languageModelAPI.availability();
    const summarizerAvailable = summarizerAPI ? await summarizerAPI.availability() : 'unavailable';

    return {
      promptAPI: promptAvailable,
      summarizerAPI: summarizerAvailable,
      ready: promptAvailable === 'available' || summarizerAvailable === 'available' ||
             promptAvailable === 'downloadable' || summarizerAvailable === 'downloadable',
      downloading: promptAvailable === 'downloading' || summarizerAvailable === 'downloading'
    };
  } catch (error) {
    return {
      promptAPI: 'unavailable',
      summarizerAPI: 'unavailable',
      ready: false,
      error: error.message
    };
  }
}
