#!/usr/bin/env node
const { Command } = require("commander");
const { terminal } = require("terminal-kit");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");

const program = new Command();

const isSubPath = (parentPath, childPath) => {
  const relative = path.relative(parentPath, childPath);
  const normalizedRelative = relative.replace(/[\\/]/g, "/").toLowerCase();
  return (
    normalizedRelative &&
    !normalizedRelative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
};

const formatTime = (time) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
};

const handlefiles = (workspace) => {
  const USERNAME = os.userInfo().username;
  const historyPath = `C:/Users/${USERNAME}/AppData/Roaming/Code/User/History`;
  const files = [];

  const histories = fs.readdirSync(historyPath);
  for (const historyFolder of histories) {
    const entryJsonFilePath = path.join(
      historyPath,
      historyFolder,
      "entries.json"
    );
    const entry = JSON.parse(fs.readFileSync(entryJsonFilePath, "utf8"));
    try {
      const resourcePath = fileURLToPath(entry.resource);
      if (isSubPath(workspace, resourcePath)) {
        files.push({
          entry,
          resourcePath,
          historyPath,
          historyFolder,
        });
      }
    } catch (e) {}
  }

  return files;
};

const showList = (workspace) => {
  const listHeader = ["File", "Updated At", "History Count"];
  const files = handlefiles(workspace);
  const list = files.map(({ entry, resourcePath }) => {
    const { timestamp } = entry.entries.sort(
      (a, b) => b.timestamp - a.timestamp
    )[0];
    return [
      path.relative(workspace, resourcePath),
      new Date(timestamp).toLocaleString(),
      entry.entries.length,
    ];
  });
  list.sort((a, b) => new Date(a[1]) - new Date(b[1]));
  terminal.table([listHeader, ...list]);
};

const recover = (workspace) => {
  const files = handlefiles(workspace);
  const confirm = (inputTime) => {
    try {
      const time = new Date(inputTime);
      if (isNaN(time.getTime())) {
        terminal.error.nextLine(1).red("[ERROR]\t").grey("Invalid date.");
        terminal.processExit(1);
      } else {
        terminal
          .nextLine(1)
          .yellow("Are you sure you want to go back to this time? [y/n] ");
        terminal.yesOrNo(
          { yes: ["y", "ENTER"], no: ["n"], echoYes: true, echoNo: true },
          (_, res) => {
            if (res) {
              terminal.cyan("yes");
              try {
                const progressBar = terminal.nextLine(1).progressBar({
                  width: 80,
                  title: "Recoveing Files:",
                  eta: true,
                  percent: true,
                });
                if (files.length === 0) {
                  progressBar.update(1);
                  terminal.processExit(0);
                }
                files.forEach(
                  (
                    { entry, resourcePath, historyPath, historyFolder },
                    fileIndex
                  ) => {
                    const index = entry.entries.findIndex(
                      (h) => h.timestamp >= time.getTime()
                    );
                    if (index >= 0) {
                      const fileToRecover = path.join(
                        historyPath,
                        historyFolder,
                        entry.entries[index].id
                      );
                      const fileToReplace = path.join(
                        path.dirname(resourcePath),
                        path
                          .basename(resourcePath)
                          .replace(
                            /\.[^/.]+$/,
                            `_recovery_${entry.entries[index].timestamp}` + "$&"
                          )
                      );
                      fs.copyFileSync(fileToRecover, fileToReplace);
                    }
                    const progress = fileIndex / (files.length - 1);
                    progressBar.update(progress);

                    if (progress >= 1) {
                      // Cleanup and exit
                      setTimeout(function () {
                        terminal.processExit(0);
                      }, 200);
                    }
                  }
                );
              } catch (e) {
                terminal.error.nextLine(1).red("[ERROR]\t").grey(e.message);
                terminal.processExit(1);
              }
            } else {
              terminal.cyan("no");
              terminal.processExit(1);
            }
          }
        );
      }
    } catch (e) {
      terminal.error.nextLine(1).red("[ERROR]\t").grey(e.message);
      terminal.processExit(1);
    }
  };
  terminal.yellow("Which to go back to? (YYYY-MM-DD HH:mm:ss) ");
  const times = [
    ...new Set(
      files
        .map((f) => f.entry.entries)
        .flat()
        .map((e) => formatTime(e.timestamp))
    ),
  ];
  terminal.inputField(
    {
      cancelable: true,
      default: formatTime(new Date()),
      autoComplete: times,
      autoCompleteHint: true,
      autoCompleteMenu: true,
    },
    (_, input) => confirm(input)
  );
};

program
  .name("vs-history")
  .description("A tool to recover deleted files from vscode folder history.")
  .version("1.0.2");

program
  .command("list")
  .description("List all relative files from vscode folder history.")
  .option("-w, --workspace <path>", "which folder to list")
  .action((_, options) => {
    const workspace = options.workspace
      ? path.resolve(options.workspace)
      : process.cwd();
    showList(workspace);
  });

program
  .command("recover")
  .description("Recover files to special time.")
  .option("-w, --workspace <path>", "which folder to recover")
  .action((_, options) => {
    const workspace = options.workspace
      ? path.resolve(options.workspace)
      : process.cwd();
    recover(workspace);
  });

program.parse();
