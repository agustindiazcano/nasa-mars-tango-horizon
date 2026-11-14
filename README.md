# Tango Horizon: AI Systems for EVA and Mars Exploration

**Autonomous Multi-Agent AI Systems & Run-Time Assurance for Extravehicular Activities (EVA)**

## Team

- Agustin Diaz Cano
- Baltazar Salerno
- Milagros Sotelo
- Federico Yaconis

## AI-assisted development methodology (Software 3.0)

This project was built with AI-assisted development in the Software 3.0 style: AI coding agents took part in the whole development process (implementation, tests, CI/CD, pull requests, commits and documentation validated and designed by human, deploy), under human direction and review. Coding agents used: Codex, Claude Code and Gemini Antigravity.

**Contracts for agent context.** Agents receive their context through contract files: [`AGENTS.md`](AGENTS.md) (rules), [`PENDING.md`](PENDING.md) (prioritized open tasks) and [`LASTCONTEXT.md`](LASTCONTEXT.md) (latest state and next step). Every task updates [`PENDING.md`](PENDING.md) and [`LASTCONTEXT.md`](LASTCONTEXT.md) so the next agent starts from the same state.

**Human responsibility (human in the loop).** All plan, code review, data validation, designs, mathematical formulations, implementations and empirical results were audited and verified by the authors.

## License

Copyright (c) 2026 Agustin Diaz-Cano, Baltazar Salerno, Milagros Sotelo and Federico Yaconis.

This project is licensed under the [MIT License](LICENSE).
