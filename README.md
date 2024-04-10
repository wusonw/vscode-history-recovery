# VSR

> a vscode timeline history file recovery cli tool

## Installation

```bash
npm install -g vscode-history-recovery
```

```bash
Usage: vs-history [options] [command]

A tool to recover deleted files from vscode folder history.

Options:
  -V, --version      output the version number
  -h, --help         display help for command

Commands:
  list [options]     List all relative files from vscode folder history.
  recover [options]  Recover files to special time.
  help [command]     display help for command
```

## Attention

- it only works on Windows platform
- it only works for vscode
- If you do not specify a working directory, the current execution path will be used.

## LICENSE

MIT
