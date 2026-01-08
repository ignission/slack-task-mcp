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

## Before / After

```
❌ Before
Mention arrives → "What do they want?" → Freeze → Postpone → Forget

✅ After
Mention arrives → Paste thread URL → Purpose, unknowns & next action organized → Start immediately
```

---

## Who is this for?

- 💭 You read a Slack message multiple times but still don't know where to start
- 📝 Writing replies takes forever because you overthink the wording
- 🔄 You postpone complex requests and end up forgetting them
- 🧠 You have ADHD traits and struggle with task initiation

---

## Use Cases

### 1. Break down a vague request

> "Can you handle the quarterly report?"

**What this tool does:**
- Clarifies what "handle" means (create? review? present?)
- Identifies unknowns (deadline? format? audience?)
- Generates a confirmation message to ask the right questions
- Breaks the task into 5-minute steps once clarified

### 2. Structure a messy reply

> "Done with the thing. Attached. Check it."

**After editing:**
> "I've completed the quarterly report and attached it. Could you review it when you have a moment? Let me know if any changes are needed."

- Conclusion → Reasoning → Action structure
- Polite but concise tone

### 3. Resume work after interruption

> "What was I working on for that client request?"

**What this tool does:**
- Searches past Slack threads
- Shows task progress and next steps
- No need to re-read the entire thread

### 4. Triage multiple mentions

When you have 10+ unread mentions:
- Analyze each thread quickly
- Identify priorities (blocking others? deadline?)
- Generate confirmation messages for unclear ones
- Save as tasks and tackle one by one

---

## Demo

```
You: Analyze this thread https://xxx.slack.com/archives/C123/p456

Claude: ## Request Analysis

### Summary
- **Purpose**: Create sales report for Q4
- **Deliverable**: PDF report with charts
- **Deadline**: Next Friday

### Unknowns
- ❓ Which metrics to include?
  - Impact: Can't start without this
  - Options: Revenue only / Revenue + costs / Full P&L

### Suggested Confirmation Message
"Thanks for the request! Quick question - should I include just revenue,
or the full P&L breakdown? Also, should I use the same template as Q3?"

### Next Action
📌 Send confirmation message (2 min)

---

You: They said full P&L, same template. Break it down and save.

Claude: ✅ Task saved!

### Q4 Sales Report
1. ☐ Open Q3 template and duplicate (2 min)
2. ☐ Export Q4 data from dashboard (3 min)
3. ☐ Paste revenue numbers (5 min)
4. ☐ Paste cost numbers (5 min)
5. ☐ Update charts (5 min)
6. ☐ Write summary paragraph (5 min)
7. ☐ Export as PDF and send (2 min)

📌 Start with step 1 - just 2 minutes!
```

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

- **Offload from your brain** — Save tasks and forget them. Free up working memory.
- **Break into <5 min steps** — Build small wins
- **Easiest step first** — Lower the barrier to start
- **Clear stopping points** — Easy to pause and resume
- **Slack as context DB** — Ask Claude "what happened with that?"

### The Real Value: Stop Carrying Everything in Your Head

```
❌ Keeping tasks in your head
"Don't forget this" + "That too" + "And this..." → Constant working memory drain → Exhaustion

✅ Offload to MCP
Save task → OK to forget → Brain freed up → Focus on just one thing
```

Your brain is for thinking, not for storing. Let the tool remember so you don't have to.

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
