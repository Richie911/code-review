# CodeReview AI

AI-powered code review assistant for GitHub and GitLab pull requests using Chrome's built-in AI APIs.

## Features

- 🤖 **AI Code Review**: Analyzes code changes for bugs, security issues, and best practices using Chrome's Prompt API
- 📝 **Smart Summaries**: Generates concise PR summaries using Chrome's Summarizer API
- 🔍 **Inline Analysis**: Reviews appear directly in your PR workflow
- 🌐 **Multi-Platform**: Works with both GitHub and GitLab
- 🔒 **Privacy First**: All processing happens locally in your browser using Chrome's built-in AI

## Requirements

- Chrome 138+ with built-in AI features enabled
- Active internet connection for initial model download

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `codereview-ai` directory

## Usage

1. Navigate to any GitHub or GitLab pull request page
2. Click the "AI Review" button that appears in the PR header
3. View AI-generated insights in the side panel

## Development

### Project Structure

```
codereview-ai/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for AI API calls
├── content.js          # Content script for PR page injection
├── sidebar.html        # Side panel UI
├── sidebar.js          # Side panel logic
├── styles.css          # Injected styles
└── icons/              # Extension icons
```

### Testing Locally

1. Load the extension in Chrome
2. Open any GitHub PR (example: https://github.com/microsoft/vscode/pulls)
3. Click "AI Review" button
4. Check browser console for logs

## Technologies Used

- Chrome Extension Manifest V3
- Chrome's Prompt API (Gemini Nano)
- Chrome's Summarizer API
- Vanilla JavaScript (no frameworks)

## Hackathon Submission

Built for the Google Chrome AI Hackathon 2025.

**Categories:**
- Most Helpful Chrome Extension
- Best Hybrid AI Application

**Key Features:**
- Combines Prompt API and Summarizer API for comprehensive code review
- Solves real developer pain points
- Privacy-focused local processing
- Works across major code hosting platforms

## Future Enhancements

- [ ] Support for more code hosting platforms (Bitbucket, Azure DevOps)
- [ ] Translator API integration for multilingual teams
- [ ] Custom review templates
- [ ] Export review reports
- [ ] Integration with CI/CD pipelines

## License

MIT License

## Contributing

Contributions welcome! Please open an issue or PR.

---

🤖 Powered by Chrome's Built-in AI
