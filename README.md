# Claude Status Bar

> Powerline-style status bar for Claude Code CLI with i18n support (English/Korean)

## Features

- **Powerline Style**: Beautiful arrow separators with customizable colors
- **11 Built-in Widgets**: Model, Git branch, Tokens, Cost, Session time, Usage, CWD, Context window, Todo progress, Memory usage, File changes
- **Multiline Support** (v1.3.0): Automatically wraps to multiple lines when terminal width is exceeded - no widgets are hidden
- **Context Window Usage**: Real-time visualization of context window consumption
- **Todo Progress**: Track your task completion progress
- **Multiple Themes**: powerline-dark, powerline-light, minimal
- **Interactive TUI**: Configure widgets and themes with keyboard navigation
- **i18n Support**: Full internationalization with English and Korean

## Quick Start

```bash
# Run directly with npx
npx claude-status-bar --demo

# Or install globally
npm install -g claude-status-bar
claude-status-bar --demo
```

## Integration with Claude Code

Add to your `.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx claude-status-bar"
  }
}
```

Or use the built-in command:

```bash
claude /statusline
```

## Commands

### Render Status Bar (default)

```bash
# Reads JSON from stdin (used by Claude Code)
echo '{"model":{"id":"claude-sonnet-4"},...}' | claude-status-bar

# Demo mode
claude-status-bar --demo
```

### Configuration

```bash
# Open interactive TUI
claude-status-bar config

# Show current config
claude-status-bar config --show

# Set theme
claude-status-bar config --theme minimal

# Reset to defaults
claude-status-bar config --reset
```

### List Resources

```bash
# List available themes
claude-status-bar themes

# List available widgets
claude-status-bar widgets
```

## Widgets

| Widget | Description | Default |
|--------|-------------|---------|
| `model` | Current Claude model name | Enabled |
| `git` | Git branch with dirty indicator | Enabled |
| `tokens` | Estimated token usage | Enabled |
| `cost` | API cost for session | Enabled |
| `session` | Session duration | Enabled |
| `usage` | Current 5-hour and weekly Claude usage | Disabled |
| `cwd` | Current working directory | Enabled |
| `context` | Context window usage (%) | Enabled |
| `todo` | Todo list progress | Disabled |
| `memory` | Process memory usage | Disabled |
| `files` | Number of changed files | Disabled |

## Themes

### powerline-dark (default)
Full Powerline symbols with dark colors. Requires a [Nerd Font](https://www.nerdfonts.com/) for best results.

### powerline-light
Lighter color variant of Powerline theme.

### minimal
ASCII-only symbols for terminals without Powerline fonts.

## Configuration File

Configuration is stored in `~/.claude-status-bar/config.json`:

```json
{
  "version": 1,
  "theme": "powerline-dark",
  "locale": "auto",
  "widgets": {
    "model": { "enabled": true, "order": 0 },
    "git": { "enabled": true, "order": 1 },
    "tokens": { "enabled": true, "order": 2 },
    "cost": { "enabled": true, "order": 3 },
    "session": { "enabled": true, "order": 4 },
    "usage": { "enabled": false, "order": 5 },
    "cwd": { "enabled": true, "order": 6 },
    "context": { "enabled": true, "order": 7 },
    "todo": { "enabled": false, "order": 8 }
  },
  "behavior": {
    "contextWarningThreshold": 70,
    "contextDangerThreshold": 90,
    "usageRefreshMs": 60000,
    "usageProbeTimeoutMs": 8000,
    "usageStaleMaxMs": 600000,
    "claudeExecutable": "claude"
  }
}
```

## Internationalization (i18n)

Claude Status Bar supports multiple languages:

| Locale | Language |
|--------|----------|
| `en` | English (default) |
| `ko` | 한국어 (Korean) |
| `auto` | Auto-detect from system |

The language is automatically detected from your system locale. You can also set it manually in the config file by changing the `locale` field.

## Context Window Widget

The context window widget shows how much of Claude's memory is being used:

```
context 78%
```

## Usage Widget

Shows Claude CLI usage from the local `/usage` screen:

```
5h 4% | Wk 14%
```

- Requires an authenticated local `claude` CLI on your `PATH`
- Uses a PTY probe and caches results for 60 seconds
- Hides itself if usage data cannot be parsed

## Todo Progress Widget

Shows your task completion progress from TodoWrite tool calls:

```
TODO 3/7 [42%]
```

Enable it in config or TUI to track your development progress.

## Requirements

- Node.js 18+
- A terminal with ANSI color support
- (Optional) Nerd Font for Powerline symbols

## Development

```bash
# Clone and install
git clone https://github.com/yourusername/claude-status-bar
cd claude-status-bar
npm install

# Build
npm run build

# Test
npm test

# Run in dev mode
npm run dev
```

## License

MIT
