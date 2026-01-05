# slack-task-mcp

Slack Task Management MCP Server for Claude Code / Claude Desktop

[![npm version](https://badge.fury.io/js/slack-task-mcp.svg)](https://www.npmjs.com/package/slack-task-mcp)

[日本語](./README.ja.md)

## Who is this for?

- You get overwhelmed when Slack mentions pile up
- You freeze when complex requests come in, unsure what to ask
- Writing replies takes too long
- You break down tasks but lose focus midway

## Installation

```bash
# Authenticate (first time only)
npx slack-task-mcp auth

# Check authentication status
npx slack-task-mcp auth status
```

## Claude Desktop Configuration

### macOS

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "npx",
      "args": ["-y", "slack-task-mcp"]
    }
  }
}
```

### Windows

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack-task": {
      "command": "npx.cmd",
      "args": ["-y", "slack-task-mcp"]
    }
  }
}
```

Restart Claude Desktop after configuration.

## Features

| Tool | Description |
|------|-------------|
| `get_slack_thread` | Fetch messages from a Slack thread URL |
| `analyze_request` | Analyze requests and generate purpose, questions, and confirmation messages |
| `draft_reply` | Edit and structure replies logically |
| `save_task` | Save tasks (broken into 5-minute steps) |
| `list_tasks` | Display task list |
| `search_tasks` | Search tasks by keyword or date |
| `complete_step` | Mark a step as complete |
| `search_slack` | Search Slack messages by keyword |

## Usage

### Analyze a Slack thread

```
Analyze this thread: https://xxx.slack.com/archives/C12345678/p1234567890
```

### Save as a task

```
Break this down into 5-minute steps and save it
```

### Edit a reply

```
Edit this reply: "The report is done. Please check it."
```

## CLI Commands

```bash
npx slack-task-mcp auth          # Authenticate
npx slack-task-mcp auth status   # Check auth status
npx slack-task-mcp auth logout   # Logout
npx slack-task-mcp --help        # Help
```

## Data Storage

```
~/.slack-task-mcp/
├── credentials.json  # Authentication credentials
└── tasks.json        # Task data
```

## License

MIT
