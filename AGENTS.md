# AGENTS.md — AI Agent Rules

- Never write task prompts or markdown docs into source code
- Never commit `.env`, databases, backups, or real business data
- Never push to remote unless explicitly asked
- After changes: run `node --check src/**/*.js` and `node --test tests/*.test.js`
