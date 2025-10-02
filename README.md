# CodeReview AI

AI-powered code review assistant for GitHub and GitLab pull requests using Chrome's built-in AI APIs. Get instant, comprehensive code reviews with interactive Q&A—all processed locally in your browser with zero configuration.

## ✨ Features

### Core Capabilities
- 🤖 **Comprehensive AI Code Review**: 9-section structured analysis covering:
  - Overall assessment and readiness
  - Critical issues (blockers)
  - Potential bugs and logic errors
  - Security vulnerabilities
  - Performance and scalability concerns
  - Code quality and maintainability
  - Architecture and design patterns
  - Style suggestions and nitpicks
  - Positive observations

- 💬 **Interactive Q&A**: Ask follow-up questions about the review
  - Context-aware answers that reference specific PR code
  - Conversation history maintained across questions
  - Get code examples and actionable solutions

- 📝 **Smart Summaries**: Generates concise PR overviews using Chrome's Summarizer API

- 🎨 **Beautiful UI**:
  - Side panel with markdown formatting
  - Syntax highlighting for code blocks
  - Collapsible Q&A section
  - Smooth animations and loading states

- 🔒 **Privacy First**: All AI processing happens locally using Chrome's Gemini Nano
  - No API keys required
  - No data sent to cloud servers
  - Review proprietary code with confidence

- 🌐 **Multi-Platform**: Works with both GitHub and GitLab pull requests

## 📋 Requirements

- **Chrome Version**: Chrome 140+ (Stable or Canary)
- **Operating System**: Windows, macOS, or Linux
- **Internet Connection**: Required for initial AI model download (~3GB, one-time)
- **Storage**: ~3GB free space for AI model

## 🚀 Installation

### Step 1: Install Chrome Extension

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yourusername/code-review-ai.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top right corner)

4. Click **"Load unpacked"**

5. Select the `code-review` directory

6. The extension icon should appear in your toolbar

### Step 2: Enable Chrome AI Features

**This is critical! The extension won't work without this step.**

1. Open a new tab and navigate to:
   ```
   chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
   ```

2. Find **"Prompt API for Gemini Nano"**

3. Change the dropdown from **"Default"** to **"Enabled"**

4. Click the **"Relaunch"** button that appears at the bottom

5. Chrome will restart with AI features enabled

### Step 3: Download AI Model (First-Time Only)

The first time you use the extension, Chrome needs to download the Gemini Nano model (~3GB). This is a **one-time** process.

**What to expect:**

1. Navigate to any GitHub or GitLab PR
2. Click the **"AI Review"** button
3. The extension will show: *"AI model is downloading (5-10 minutes)"*
4. The download happens in the background—you can close the tab
5. The extension auto-checks status every 30 seconds
6. Once complete, click **"AI Review"** again to analyze the PR

**To manually check download status:**

Open Chrome DevTools Console (F12) and run:
```javascript
await LanguageModel.availability()
// Returns: "downloadable", "downloading", or "available"
```

## 📖 Usage

### Running a Code Review

1. **Navigate to a Pull Request**
   - Open any GitHub PR (e.g., `https://github.com/microsoft/vscode/pulls`)
   - Or any GitLab merge request

2. **Start Review**
   - Look for the **"AI Review"** button in the PR header
   - Click it to start analysis
   - The side panel will open automatically

3. **View Results**
   - Review appears in structured sections
   - Color-coded tags highlight bugs, security issues, performance concerns
   - Code blocks are syntax highlighted
   - Markdown formatting makes it easy to read

### Using Interactive Q&A

After the review completes, you can ask follow-up questions:

1. **Open Q&A Section**
   - Scroll down in the side panel
   - Click **"💬 Ask Questions About This Review"**

2. **Ask Questions**
   - Type your question (up to 500 characters)
   - Examples:
     - *"How do I fix the security vulnerability in section 4?"*
     - *"Can you explain the N+1 query issue with code examples?"*
     - *"What's the best way to refactor this for better performance?"*
   - Press **Ctrl+Enter** or click **"Ask"**

3. **Get Contextual Answers**
   - AI remembers the PR context and previous review
   - Answers reference specific sections
   - Includes code examples when applicable
   - Conversation history is preserved

4. **Continue the Conversation**
   - Ask follow-up questions
   - Last 3 Q&As are maintained for context
   - Each new PR review starts a fresh Q&A session

## 🛠️ Troubleshooting

### "AI is not defined" Error

**Cause**: Chrome AI features not enabled or Chrome version too old

**Solution**:
1. Check Chrome version: `chrome://version/` (need Chrome 140+)
2. Enable the flag: `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
3. Relaunch Chrome completely
4. Reload the extension in `chrome://extensions/`

### "AI model is downloading..." Stuck

**Cause**: Download is still in progress or failed

**Solution**:
1. Wait 10-15 minutes (download can be slow on slower connections)
2. Check download status in DevTools console:
   ```javascript
   await LanguageModel.availability()
   ```
3. If stuck, restart Chrome and try again
4. Ensure you have 3GB+ free disk space

### "No response from AI" Error

**Cause**: Extension context was invalidated or service worker terminated

**Solution**:
1. Reload the extension: Go to `chrome://extensions/` → Click reload icon
2. Refresh the PR page
3. Try clicking "AI Review" again

### Review Button Not Appearing

**Cause**: Page not fully loaded or content script failed to inject

**Solution**:
1. Refresh the PR page
2. Check if you're on the PR "Conversation" or "Files changed" tab
3. Check browser console for errors (F12)
4. Ensure extension is enabled in `chrome://extensions/`

### Q&A Not Working

**Cause**: PR data not stored or AI API unavailable

**Solution**:
1. Run a fresh code review first
2. Ensure the review completed successfully
3. Check that the Q&A section appeared after review
4. Verify AI model is available (not downloading)

## 🏗️ Development

### Project Structure

```
code-review/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service worker for AI API calls
├── content.js          # Content script for PR page injection
├── sidebar.html        # Side panel UI with Q&A interface
├── sidebar.js          # Side panel logic and Q&A handlers
├── styles.css          # Injected styles for PR button
├── icons/              # Extension icons (16, 48, 128px)
└── ABOUT.md            # Project story and journey
```

### Key Components

**background.js**
- Handles AI API calls (LanguageModel, Summarizer)
- Dual API pattern support (global & namespaced)
- Service worker keep-alive mechanism
- Q&A context management

**content.js**
- Injects "AI Review" button into PR pages
- Extracts PR data (title, description, diff)
- Handles GitHub and GitLab DOM differences
- Opens side panel for results

**sidebar.js**
- Displays review results with markdown formatting
- Manages Q&A conversation state
- Handles user interactions (questions, toggle)
- Auto-saves Q&A history to chrome.storage

### Testing Locally

1. Load the extension in Chrome (`chrome://extensions/`)
2. Open any public GitHub PR:
   - Example: https://github.com/microsoft/vscode/pulls
   - Or search for PRs with substantial code changes
3. Click "AI Review" button
4. Open DevTools Console (F12) to see API interactions
5. Test Q&A by asking follow-up questions

### API Compatibility

The extension supports both Chrome AI API patterns:

```javascript
// Global pattern (newer)
await LanguageModel.create()
await Summarizer.create()

// Namespaced pattern (older)
await ai.languageModel.create()
await ai.summarizer.create()
```

Automatic detection ensures compatibility across Chrome versions.

## 🔧 Technologies Used

- **Chrome Extension Manifest V3**: Modern extension architecture
- **Chrome Prompt API**: Gemini Nano for code analysis and Q&A
- **Chrome Summarizer API**: PR summary generation
- **Vanilla JavaScript**: No frameworks—lightweight and fast
- **Chrome Storage API**: Persistent Q&A history
- **Chrome Side Panel API**: Dedicated review UI

## 🏆 Hackathon Submission

Built for the **Google Chrome Built-in AI Challenge 2025**.

**Submission Categories:**
- 🥇 Most Helpful Chrome Extension
- 🥈 Best Hybrid AI Application

**Why CodeReview AI Stands Out:**
- ✅ Solves real developer pain points (slow, inconsistent code reviews)
- ✅ Privacy-first architecture (all local, no cloud)
- ✅ Professional-grade review quality (9 structured sections)
- ✅ Interactive Q&A for learning and problem-solving
- ✅ Beautiful, polished UI with attention to detail
- ✅ Works across Chrome versions (dual API support)

**Impact:**
- Democratizes senior-level code review expertise
- Reduces PR review time from hours to seconds
- Educational tool for junior developers
- Catches bugs and security issues before merge

## 🚀 Future Enhancements

### Short-term
- [ ] Custom review focus (quick scan vs. deep dive)
- [ ] Code suggestions with diffs
- [ ] Export review reports (PDF, Markdown)
- [ ] Keyboard shortcuts (Ctrl+Shift+R for review)

### Medium-term
- [ ] Support for Bitbucket and Azure DevOps
- [ ] Custom rules engine for team-specific patterns
- [ ] Review templates for different project types
- [ ] PR health score (0-100 quality rating)

### Long-term
- [ ] VS Code integration (catch issues pre-commit)
- [ ] CI/CD integration (auto-review on PR creation)
- [ ] Team learning (improve AI from historical decisions)
- [ ] Multi-language expansion (specialized frameworks)

See [ABOUT.md](./ABOUT.md) for the full project story and development journey.

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue with detailed reproduction steps
2. **Suggest Features**: Share your ideas in the issues tab
3. **Submit PRs**: Fork, create a feature branch, and submit a PR
4. **Improve Docs**: Help make setup clearer for new users
5. **Test**: Try the extension on various PR types and report findings

**Development Setup:**
```bash
git clone
cd code-review
# Load extension in chrome://extensions/
# Make changes and reload extension to test
```

🤖 **Powered by Chrome's Built-in AI (Gemini Nano)**

⭐ If you find CodeReview AI helpful, please star the repo and share it with your team!
