<p align="center">
  <h1 align="center">Slack Task MCP</h1>
</p>

<p align="center">
  <strong>Zero friction from mention to action</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ignission/slack-task-mcp"><img src="https://img.shields.io/npm/v/@ignission/slack-task-mcp" alt="npm version"></a>
  <a href="https://opensource.org/licenses/ISC"><img src="https://img.shields.io/badge/License-ISC-blue.svg" alt="License: ISC"></a>
</p>

<p align="center">
  An MCP server designed for users with ADHD traits
</p>

<p align="center">
  <a href="README.ja.md">日本語</a>
</p>

---

## Why

When Slack mentions pile up, it's hard to know where to start. Complex requests leave you frozen, unsure what to ask. Writing replies takes forever. Sound familiar?

| Problem | Solution |
|:--------|:---------|
| "What do they want?" is unclear | Clarify the purpose |
| "What should I ask?" is unknown | Identify unknowns + draft confirmation messages |
| "How should I reply?" takes time | Edit & structure reply messages |
| "What's next?" causes paralysis | Provide next actions |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Desktop / Claude Code                               │
│  └── MCP Client                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ MCP Protocol
┌──────────────────────────▼──────────────────────────────────┐
│  Slack Task MCP Server                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MCP Tools                                             │ │
│  │  • get_slack_thread  • save_task     • analyze_request │ │
│  │  • search_slack      • list_tasks    • draft_reply     │ │
│  │                      • complete_step                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Agent SDK Layer (AI-powered analysis)                 │ │
│  │  • analyze.js → Request analysis                       │ │
│  │  • draft-reply.js → Reply editing                      │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
   ┌─────────────┐                   ┌─────────────┐
   │  Slack API  │                   │  Claude API │
   │ (User Token)│                   │ (Agent SDK) │
   └─────────────┘                   └─────────────┘
```

---

## Features

| Tool | Description | Agent SDK |
|------|-------------|:---------:|
| `get_slack_thread` | Fetch messages from a Slack thread URL | - |
| `analyze_request` | Analyze requests, identify purpose & unknowns | ✅ |
| `draft_reply` | Edit and structure replies logically | ✅ |
| `save_task` | Save tasks (broken into <5 min steps) | - |
| `list_tasks` | Show active task list | - |
| `search_tasks` | Search tasks by keyword/date | - |
| `complete_step` | Mark a step as complete | - |
| `search_slack` | Search Slack messages by keyword | - |

---

## Quick Start

### 1. Authenticate with Slack

```bash
npx -y @ignission/slack-task-mcp auth login
```

A browser will open for Slack authentication. Repeat for multiple workspaces.

### 2. Configure Claude Code / Claude Desktop

**Claude Code (Terminal)**:

```bash
claude mcp add slack-task -- npx -y @ignission/slack-task-mcp
```

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "npx",
      "args": ["-y", "@ignission/slack-task-mcp"]
    }
  }
}
```

### 3. Restart

Restart Claude Code / Claude Desktop to apply the configuration.

---

## Usage

### Basic Workflow

```
1. get_slack_thread  →  Fetch thread (context DB)
2. analyze_request   →  Generate purpose, unknowns, confirmation drafts
3. draft_reply       →  Edit and structure reply drafts
4. save_task         →  Save as task
5. complete_step     →  Track progress
```

### Examples

#### Fetch & Analyze a Thread

```
Analyze this Slack thread:
https://xxx.slack.com/archives/C12345678/p1234567890123456
```

#### Save a Task

```
Break this down into steps under 5 minutes and save it
```

#### Edit a Reply

```
Edit this reply: "Report is done. Attached. Please check."
```

#### List Tasks

```
Show my task list
```

#### Complete a Step

```
Mark step 1 as complete
```

---

## ADHD-Friendly Design

- **Break into <5 min steps** — Build small wins
- **Easiest step first** — Lower the barrier to start
- **Clear stopping points** — Easy to pause and resume
- **Slack as context DB** — Ask Claude "what happened with that?"

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** (ES Modules) | Runtime |
| **MCP Protocol** | Communication with Claude Code/Desktop |
| **Claude Agent SDK** | AI-powered request analysis & reply editing |
| **Slack Web API** | Slack integration (User Token) |
| **Zod** | Schema validation |
| **Cloudflare Workers** | OAuth authentication (token exchange) |

---

## Project Structure

```
slack-task-mcp/
├── src/
│   ├── index.js         # MCP server entry point
│   ├── cli.js           # CLI commands
│   ├── auth.js          # OAuth authentication (hybrid)
│   ├── credentials.js   # Credential management
│   ├── paths.js         # Path management (XDG compliant)
│   └── agents/          # Agent SDK agents
│       ├── index.js     # Common settings
│       ├── analyze.js   # Request analysis
│       └── draft-reply.js # Reply editing
├── worker/              # Cloudflare Workers (token exchange)
│   ├── index.js
│   └── wrangler.toml
└── package.json
```

---

## Data Storage

Data is stored following XDG Base Directory Specification:

```
~/.local/share/slack-task-mcp/
├── credentials/
│   ├── T01234567.json     # Per-workspace credentials
│   └── T98765432.json
└── tasks.json              # Task data
```

If `XDG_DATA_HOME` is set, that path will be used instead.

---

## Troubleshooting

### Slack API Errors

```bash
npx -y @ignission/slack-task-mcp auth status              # Check auth status
npx -y @ignission/slack-task-mcp auth login               # Authenticate new workspace
npx -y @ignission/slack-task-mcp auth logout              # Logout from all workspaces
npx -y @ignission/slack-task-mcp auth logout -w mycompany # Logout from specific workspace
```

### MCP Server Not Recognized

- Verify the config file path is correct
- Restart Claude Code / Claude Desktop

### Can't Read Private Channels

- You can only read channels you're a member of

---

## Contributing

Issues and PRs are welcome!

---

## License

[ISC](LICENSE)
