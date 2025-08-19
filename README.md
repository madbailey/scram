# scram

A fast, lighthearted terminal file navigator providing an intuitive two-pane interface for file exploration and preview.

## Features

- **Tree Navigation**: Hierarchical file system navigation with expand/collapse functionality
- **File Preview**: Built-in preview for various file types (text, JSON, code, images, etc.)
- **Search & Commands**: Overlay input for quick navigation and commands
- **Keyboard-Driven**: Full keyboard control with intuitive shortcuts
- **Focus Management**: Smart focus handling between components

## Scripts

- `bun run dev` - Run the application
- `bun run start` - Start navigator directly
- `bun test` - Run tests
- `bun run test:watch` - Run tests in watch mode
- `bun run build` - Build TypeScript
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier

## Navigation

### Tree Navigation
- `↑/↓` - Move selection up/down
- `→` - Step into folder
- `←` - Step out/go to parent
- `Space/Enter` - Toggle folder expansion
- `Tab` - Switch between panes

### Search & Commands
- `Ctrl+F` or `/` - Open search overlay
- `Esc` - Close overlay/quit
- `/help` - Show help
- `/up` - Go up one directory
- `/home` - Go to home directory
- `/root` - Go to root directory

## Development

1. **Install dependencies**: `bun install`
2. **Run application**: `bun run dev`
3. **Run tests**: `bun test`
4. **Check linting**: `bun run lint`
5. **Format code**: `bun run format`
