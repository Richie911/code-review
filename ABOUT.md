# CodeReview AI - Project Story

## Inspiration

As a developer who spends countless hours reviewing pull requests on GitHub, I've always felt the friction between thorough code reviews and tight deadlines. I'd see PRs sitting for days waiting for review, or worse, getting merged with critical issues because no one had time to properly examine them. When I came across Chrome's Built-in AI challenge, I immediately saw an opportunity to solve this problem.

What excited me most was the idea of bringing AI code review directly into the browser—no API keys, no cloud dependencies, just instant, intelligent feedback powered by Chrome's local Gemini Nano model. I wanted to build something that would make code reviews faster, more consistent, and more educational for developers at all levels.

## What it does

CodeReview AI is a Chrome extension that performs comprehensive, AI-powered code reviews directly in your browser on GitHub and GitLab pull requests. Here's what makes it special:

**Core Features:**
- **One-Click Analysis**: Click the "AI Review" button on any PR page to get instant feedback
- **Comprehensive Reviews**: Analyzes code for bugs, security vulnerabilities, performance issues, architecture concerns, and best practices
- **Structured Feedback**: Presents findings in 9 organized sections from critical blockers to positive observations
- **Interactive Q&A**: Ask follow-up questions about the review and get context-aware answers
- **Privacy-First**: All AI processing happens locally using Chrome's Built-in AI—no data leaves your device
- **Beautiful UI**: Side panel interface with markdown formatting, syntax highlighting, and smooth animations

**Review Categories:**
1. Overall Assessment
2. Critical Issues (Blockers)
3. Potential Bugs and Logic Errors
4. Security Concerns
5. Performance and Scalability
6. Code Quality and Maintainability
7. Architecture and Design
8. Nitpicks and Style Suggestions
9. Positive Observations

The interactive Q&A feature is a game-changer. After reading the review, developers can ask questions like "How do I fix the N+1 query issue in section 5?" and get detailed, contextual answers that reference the specific PR code.

## How we built it

Building CodeReview AI was an iterative journey of learning Chrome's new AI APIs and optimizing the user experience:

**Tech Stack:**
- **Chrome Extension (Manifest V3)**: Content scripts, service workers, and side panel API
- **Chrome Built-in AI APIs**: LanguageModel (Gemini Nano), Summarizer API
- **Vanilla JavaScript**: No frameworks—kept it lightweight and fast
- **GitHub DOM Injection**: Dynamic button insertion into PR pages

**Development Process:**

1. **API Discovery Phase**: I started by exploring Chrome's AI APIs documentation and quickly discovered they were evolving. The APIs could be accessed in two patterns—global objects (`LanguageModel`) and namespaced (`ai.languageModel`). I built fallback detection to support both patterns for maximum compatibility.

2. **Prompt Engineering**: This was the most time-consuming part. I went through dozens of iterations to craft the perfect system prompt. The key breakthrough was structuring the prompt with clear sections and specific guidance on what to look for in each category (e.g., "highlight O(n²) where O(n) is possible").

3. **UI/UX Refinement**: I initially had a basic text display, but realized developers needed better formatting. I implemented a markdown formatter that handles headers, code blocks, lists, and even smart keyword tagging (bugs, security, performance) without interfering with code snippets.

4. **Interactive Q&A**: This feature required solving the context management problem. I built a system that passes the PR data, review summary, and last 3 Q&As to maintain conversation continuity. The AI can reference specific sections and provide targeted solutions.

5. **Download Experience**: A major challenge was handling first-time users waiting for the ~3GB Gemini Nano model to download. I designed a friendly, informative download screen with auto-checking status that doesn't interrupt the user's workflow.

**Technical Innovations:**
- Context-aware Q&A system that remembers conversation history
- Dual API pattern detection for Chrome version compatibility
- Service worker keep-alive mechanism to prevent termination
- Smart prompt truncation to stay within token limits
- Markdown formatter with nested structure support

## Challenges we ran into

**1. The Moving Target of Chrome AI APIs**

The biggest challenge was working with experimental APIs that were actively evolving. Documentation showed examples using `LanguageModel.create()` but my Chrome version was using `ai.languageModel.create()`. I spent hours debugging before realizing different Chrome builds had different API patterns.

**Solution**: I implemented dual-pattern detection that checks for both global and namespaced APIs, with automatic fallback. This made the extension compatible across Chrome Stable, Canary, and future versions.

**2. Parameter Validation Hell**

I kept hitting cryptic errors like "The topK value provided is invalid" even when using recommended defaults from `LanguageModel.params()`. The API would return parameters that it then rejected.

**Solution**: I stripped down to minimal configuration—just `create()` with no parameters. It worked! Sometimes less is more.

**3. Service Worker Lifecycle Issues**

Chrome's service workers terminate after 30 seconds of inactivity, which would break mid-review. I'd get "Extension context invalidated" errors, frustrating the user experience.

**Solution**: Implemented a keep-alive mechanism using a 20-second interval that pings Chrome storage, preventing worker termination during active sessions.

**4. Formatting Complex Markdown**

The AI returns markdown with nested lists, code blocks, and mixed formatting. My initial formatter would break on edge cases—numbered lists inside bullets, code blocks with keywords that shouldn't be tagged, etc.

**Solution**: Built a multi-pass formatter that processes code blocks first (protecting them), then handles structure (headers, lists), and finally applies semantic tagging only to non-code content.

**5. Context Window Management**

For Q&A, I needed to pass PR context + review + conversation history, but this quickly exceeded token limits, causing the AI to fail silently.

**Solution**: Implemented smart truncation—1500 chars for review summary, 300 chars per historical Q&A, keeping only the last 3 exchanges. This maintained context while staying within limits.

**6. User Feedback on UI Polish**

During testing, I got feedback like "the status dot is too big" and "too much spacing in the download message." These small details matter for professional feel.

**Solution**: Iterated on CSS with `flex-shrink: 0` for sizing issues and redesigned the download screen with compact, gradient styling. Every pixel counts in a side panel!

## Accomplishments that we're proud of

**1. Zero-Config AI Code Reviews**

No API keys, no sign-ups, no cloud servers. Just install and click. This was the vision, and we achieved it. The privacy-first approach means developers can review proprietary code without security concerns.

**2. Professional-Grade Review Quality**

The AI doesn't just spot bugs, it understands context, suggests architectural improvements, highlights security vulnerabilities, and even acknowledges good practices.

**3. Interactive Q&A That Actually Works**

This feature could have been a gimmick, but it's genuinely useful. The AI remembers the conversation, references specific sections, and provides actionable code examples. It's like having a senior developer available 24/7.

**4. Beautiful, Polished UI**

From the gradient headers to the animated message appearance, every detail was considered. The markdown formatting with syntax highlighting makes reviews easy to read and professional-looking.

**5. Cross-Version Compatibility**

By supporting both API patterns and gracefully handling download states, the extension works reliably across different Chrome versions and configurations. This wasn't easy but was essential for hackathon judges and real users.

**6. Solving Real Problems**

I built this because I felt the pain. Seeing it work on actual PRs—catching real bugs, suggesting better patterns, explaining security issues—that's incredibly satisfying. This isn't a demo; it's a tool I'll actually use.

## What we learned

**Technical Lessons:**

1. **Experimental APIs Require Defensive Coding**: When working with evolving APIs, always check for multiple patterns, validate assumptions, and fail gracefully. Type checking (`typeof LanguageModel !== 'undefined'`) saved me countless times.

2. **Prompt Engineering is an Art**: The quality of AI output is 90% prompt, 10% model. Specific instructions ("highlight O(n²) where O(n) is possible") produce dramatically better results than vague requests ("check performance").

3. **Context is King**: The Q&A feature works because it maintains rich context. Passing just the question would get generic answers; passing PR + review + history gets targeted solutions.

4. **Service Workers Need Babysitting**: Chrome's aggressive worker termination requires creative solutions. The keep-alive pattern is essential for any extension doing long-running tasks.

5. **Token Limits are Real**: I learned to respect token limits through painful trial and error. Smart truncation and summarization are non-negotiable when working with limited context windows.

**Design Lessons:**

1. **First Impressions Matter**: The download experience for first-time users sets the tone. A confusing error vs. a friendly explanation makes the difference between uninstall and adoption.

2. **Progressive Disclosure**: Don't overwhelm users. The Q&A section is hidden until after the review, keeping the interface clean while offering power features to those who need them.

3. **Feedback Loops are Gold**: Every piece of user feedback ("status dot too big," "too much spacing") improved the product. Ship early, iterate based on real usage.

**AI Development Lessons:**

1. **Local AI is Viable**: I was skeptical that on-device AI could match cloud services. Gemini Nano proved me wrong, it's fast, intelligent, and private. The future of AI is hybrid: local for privacy-sensitive tasks, cloud for heavy lifting.

2. **Structure Beats Length**: A well-structured 200-word review beats a rambling 1000-word essay. The 9-section format guides both the AI and the reader.

3. **Balance Criticism with Recognition**: Including "Positive Observations" transforms the review from harsh criticism to constructive coaching. This makes developers more receptive to feedback.

## What's next for CodeReview AI

**Short-term Improvements:**

1. **Custom Review Focus**: Let users choose review depth (quick scan vs. deep dive) and focus areas (security-only, performance-only, etc.)

2. **Code Suggestions with Diff**: Not just "fix this"—show actual code diffs that can be copied directly into the PR

3. **Multi-File Context**: Currently analyzes the full diff; could improve by understanding file relationships and import dependencies

4. **Review Comparison**: Compare AI reviews across commits to track if issues were actually fixed

5. **Keyboard Shortcuts**: Power users want `Ctrl+Shift+R` to trigger review, `Ctrl+Shift+Q` to focus Q&A textarea

**Medium-term Features:**

1. **Team Learning**: Optional feature to anonymously share review patterns to improve AI suggestions for common issues in your codebase

2. **Custom Rules Engine**: Define your team's specific patterns—"flag any direct DB queries in controllers," "require error handling in async functions"

3. **GitLab Full Support**: Currently works on GitLab but optimized for GitHub. Needs GitLab-specific DOM handling

4. **Review Templates**: Save custom prompts for different project types (frontend, backend, security audit, refactoring review)

5. **PR Health Score**: Single number (0-100) summarizing overall PR quality based on issues found

**Long-term Vision:**

1. **IDE Integration**: Bring the same AI review into VS Code, catching issues before they're even committed

2. **Continuous Learning**: As Chrome's AI APIs evolve to support fine-tuning, adapt to your team's coding standards and historical decisions

3. **Collaboration Features**: Share reviews with team, vote on AI suggestions, build a knowledge base of resolved issues

4. **Multi-Language Expansion**: Currently focuses on common languages; expand to specialized frameworks and domain-specific languages

5. **Integration with CI/CD**: Auto-review on PR creation, block merge on critical issues, generate review summaries in PR descriptions

**Bigger Picture:**

CodeReview AI is just the beginning. The real opportunity is democratizing senior-level code review expertise. Junior developers learn faster when they understand *why* something is wrong, not just *that* it's wrong. The interactive Q&A makes this extension a teaching tool as much as a review tool.

I envision a future where every developer, regardless of team size or experience level, has access to instant, thoughtful code review. Where security vulnerabilities are caught before they're merged, where performance issues are spotted in development, and where best practices are learned through daily reinforcement.

Chrome's Built-in AI makes this possible today, privately and instantly, right in the browser. CodeReview AI is my contribution to that future.

---

*Built with ❤️ for the Chrome Built-in AI Challenge 2025*
