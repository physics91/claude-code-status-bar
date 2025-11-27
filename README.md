# Claude Status Bar

> Powerline-style status bar for Claude Code CLI with i18n support (English/Korean)

## Features

- **Powerline Style**: Beautiful arrow separators with customizable colors
- **8 Built-in Widgets**: Model, Git branch, Tokens, Cost, Session time, CWD, Context window, Todo progress
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
| `cwd` | Current working directory | Enabled |
| `context` | Context window usage (%) | Enabled |
| `todo` | Todo list progress | Disabled |

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
    "cwd": { "enabled": true, "order": 5 },
    "context": { "enabled": true, "order": 6 },
    "todo": { "enabled": false, "order": 7 }
  },
  "behavior": {
    "contextWarningThreshold": 70,
    "contextDangerThreshold": 90
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
CTX [████████░░] 78%
```

- **Green (0-70%)**: Normal usage
- **Yellow (70-90%)**: Consider summarizing
- **Red (90-100%)**: Near limit

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
