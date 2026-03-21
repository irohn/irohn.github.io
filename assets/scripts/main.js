const terminal = document.querySelector(".terminal");
const pageShell = document.querySelector(".page-shell");
const terminalBody = document.querySelector(".terminal__body");
const terminalInput = document.querySelector("#terminal-input");
const terminalText = document.querySelector("#terminal-text");
const terminalHistory = document.querySelector("#terminal-history");
const introLine = document.querySelector(".terminal__line--muted");
const promptElements = document.querySelectorAll(".terminal__prompt");
const desktopDock = document.querySelector("#desktop-dock");
const terminalLauncher = document.querySelector("#terminal-launcher");
const closeButton = document.querySelector("#terminal-close");
const minimizeButton = document.querySelector("#terminal-minimize");
const maximizeButton = document.querySelector("#terminal-maximize");
const themeToggle = document.querySelector("#theme-toggle");

const siteName = "irohn.net";
const homeDirectory = "/home/guest";
const unknownCommandMessage =
  "Command not found. Type `help` to see available commands.";
const permissionDeniedMessage =
  "User `guest` has no permissions to manipulate the filesystem";
const urlPattern = /(https?:\/\/[^\s]+)/g;
const maxHistoryLines = 1000;
const bootCommand = "whoami";
const bootDurationMs = 1000;
const themeStorageKey = "irohn-theme-preference";

let currentDirectory = homeDirectory;
let isPinnedToBottom = true;
let isMaximized = false;
let isInteractive = false;
let needsBootSequence = true;
let bootSequenceToken = 0;
let themePreference = window.localStorage.getItem(themeStorageKey) ?? "dark";

const fileSystem = createDirectory({
  home: createDirectory({
    guest: createDirectory({
      "HELP.md": createFile(() => buildHelpLines().join("\n")),
    }),
    irohn: createDirectory({}),
  }),
  bin: createDirectory({
    pwd: createFile("binary"),
    cd: createFile("binary"),
    ls: createFile("binary"),
    mkdir: createFile("binary"),
    cat: createFile("binary"),
    which: createFile("binary"),
  }),
});

const commands = {
  clear: {
    description: "Clear the terminal output.",
    example: "clear",
    builtin: true,
    run() {
      return { type: "clear" };
    },
  },
  exit: {
    description: "Close the terminal window.",
    example: "exit",
    builtin: true,
    run() {
      return { type: "close" };
    },
  },
  help: {
    description: "Explain the terminal and show help topics.",
    example: "help commands",
    builtin: true,
    run(args) {
      if (!args.length) {
        return output(buildHelpOverviewLines());
      }

      if (args[0] === "commands") {
        return output(buildCommandHelpLines());
      }

      return output([`help: unknown topic: ${args[0]}`, "Try `help commands`."]);
    },
  },
  whoami: {
    description: "Information about me.",
    example: "whoami",
    builtin: true,
    run() {
      return output([
        "My name is Ori.",
        "I am a software developer.",
        "Look at my projects at https://github.com/irohn",
      ]);
    },
  },
  pwd: {
    description: "Print the current working directory.",
    example: "pwd",
    path: "/bin/pwd",
    run() {
      return output([currentDirectory]);
    },
  },
  cd: {
    description: "Change the current working directory.",
    example: "cd /home/irohn",
    path: "/bin/cd",
    run(args) {
      const targetPath = args[0] ?? homeDirectory;
      const resolvedPath = resolvePath(targetPath);
      const node = getNode(resolvedPath);

      if (!node) {
        return output([`cd: no such file or directory: ${targetPath}`]);
      }

      if (node.type !== "directory") {
        return output([`cd: not a directory: ${targetPath}`]);
      }

      currentDirectory = resolvedPath;
      syncPrompt();
      return output([]);
    },
  },
  ls: {
    description: "List directory contents.",
    example: "ls /home",
    path: "/bin/ls",
    run(args) {
      const targetPath = args[0] ?? currentDirectory;
      const resolvedPath = resolvePath(targetPath);
      const node = getNode(resolvedPath);

      if (!node) {
        return output([`ls: cannot access '${targetPath}': No such file or directory`]);
      }

      if (node.type === "file") {
        return output([createEntryToken(basename(resolvedPath), getEntryType(node, resolvedPath))]);
      }

      return output(listDirectory(node, resolvedPath));
    },
  },
  mkdir: {
    description: "Create a directory.",
    example: "mkdir notes",
    path: "/bin/mkdir",
    run() {
      return output([permissionDeniedMessage]);
    },
  },
  cat: {
    description: "Print file contents.",
    example: "cat /home/guest/HELP.md",
    path: "/bin/cat",
    run(args) {
      if (!args.length) {
        return output(["cat: missing file operand"]);
      }

      const targetPath = resolvePath(args[0]);
      const node = getNode(targetPath);

      if (!node) {
        return output([`cat: ${args[0]}: No such file or directory`]);
      }

      if (node.type !== "file") {
        return output([`cat: ${args[0]}: Is a directory`]);
      }

      return output(readFile(node).split("\n"));
    },
  },
  which: {
    description: "Show where a command is located.",
    example: "which ls",
    path: "/bin/which",
    run(args) {
      if (!args.length) {
        return output(["which: missing command operand"]);
      }

      const target = args[0];
      const command = resolveCommand(target);

      if (!command) {
        return output([`${target} not found`]);
      }

      if (command.path) {
        return output([command.path]);
      }

      if (command.builtin) {
        return output([`${target}: shell built-in`]);
      }

      return output([`${target} not found`]);
    },
  },
};

function createDirectory(children) {
  return {
    type: "directory",
    children,
  };
}

function createFile(content) {
  return {
    type: "file",
    content,
  };
}

function readFile(node) {
  return typeof node.content === "function" ? node.content() : node.content;
}

function output(lines) {
  return { type: "output", lines };
}

function createEntryToken(value, entryType) {
  return {
    type: "entry",
    value,
    entryType,
  };
}

function buildHelpLines() {
  return buildHelpOverviewLines();
}

function buildHelpOverviewLines() {
  return [
    "This is an emulated terminal running inside the website.",
    "Type `help commands` to see the available shell commands.",
    "You can minimize, maximize, or close the terminal with the window controls.",
    "When the terminal is minimized or closed, you can use other apps from the dock.",
  ];
}

function buildCommandHelpLines() {
  return Object.entries(commands).map(([name, command]) => {
    const parts = [name];

    if (command.description) {
      parts.push(`- ${command.description}`);
    }

    if (command.example) {
      parts.push(`Example: ${command.example}`);
    }

    return parts.join(" ");
  });
}

function getPromptText() {
  const displayPath = currentDirectory.startsWith(`${homeDirectory}/`)
    ? currentDirectory.replace(homeDirectory, "~")
    : currentDirectory === homeDirectory
      ? "~"
      : currentDirectory;

  return `guest@${siteName}:${displayPath}$`;
}

function syncPrompt() {
  const promptText = getPromptText();

  promptElements.forEach((promptElement) => {
    promptElement.textContent = promptText;
  });
}

function scrollToBottom() {
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function getResolvedTheme() {
  return themePreference === "light" ? "light" : "dark";
}

function applyTheme() {
  const resolvedTheme = getResolvedTheme();
  document.documentElement.dataset.theme = resolvedTheme;
  themeToggle.setAttribute("aria-pressed", String(resolvedTheme === "light"));
  themeToggle.setAttribute(
    "aria-label",
    `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`
  );
}

function setInteractiveState(value) {
  isInteractive = value;
}

function syncWindowState() {
  terminal.classList.toggle("terminal--maximized", isMaximized);
  pageShell.classList.toggle("page-shell--maximized", isMaximized);
}

function openTerminal() {
  terminal.hidden = false;
  desktopDock.hidden = true;
  syncWindowState();
  focusInput();
  scrollToBottom();

  if (needsBootSequence) {
    runBootSequence();
  }
}

function minimizeTerminal() {
  terminal.hidden = true;
  desktopDock.hidden = false;
}

function resetTerminalState({ shouldBootSequence = false } = {}) {
  currentDirectory = homeDirectory;
  isPinnedToBottom = true;
  isMaximized = false;
  needsBootSequence = shouldBootSequence;
  bootSequenceToken += 1;
  setInteractiveState(!shouldBootSequence);
  terminalHistory.replaceChildren();
  terminalInput.value = "";
  terminalText.textContent = "";
  introLine.hidden = false;
  syncPrompt();
  syncWindowState();
}

function closeTerminal() {
  resetTerminalState();
  minimizeTerminal();
}

function toggleMaximize() {
  isMaximized = !isMaximized;
  syncWindowState();
  focusInput();
  scrollToBottom();
}

function syncCurrentLine() {
  if (!isInteractive) {
    return;
  }

  isPinnedToBottom = true;
  terminalText.textContent = terminalInput.value;
  scrollToBottom();
}

function sleep(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function basename(path) {
  if (path === "/") {
    return "/";
  }

  return path.split("/").filter(Boolean).at(-1);
}

function normalizePathParts(parts) {
  return parts.reduce((accumulator, part) => {
    if (!part || part === ".") {
      return accumulator;
    }

    if (part === "..") {
      accumulator.pop();
      return accumulator;
    }

    accumulator.push(part);
    return accumulator;
  }, []);
}

function resolvePath(targetPath) {
  const normalizedInput = targetPath === "~" ? homeDirectory : targetPath;
  const basePath = normalizedInput.startsWith("/")
    ? normalizedInput
    : `${currentDirectory}/${normalizedInput}`;
  const expandedPath = basePath.replace(/^~(?=\/|$)/, homeDirectory);
  const normalizedParts = normalizePathParts(expandedPath.split("/"));

  return normalizedParts.length ? `/${normalizedParts.join("/")}` : "/";
}

function getNode(path) {
  if (path === "/") {
    return fileSystem;
  }

  return path
    .split("/")
    .filter(Boolean)
    .reduce((node, part) => {
      if (!node || node.type !== "directory") {
        return null;
      }

      return node.children[part] ?? null;
    }, fileSystem);
}

function findCommandByPath(path) {
  return Object.values(commands).find((command) => command.path === path) ?? null;
}

function resolveCommand(commandName) {
  if (commands[commandName]) {
    return commands[commandName];
  }

  if (commandName.includes("/")) {
    const resolvedPath = resolvePath(commandName);
    const node = getNode(resolvedPath);

    if (!node || node.type !== "file") {
      return null;
    }

    return findCommandByPath(resolvedPath);
  }

  const binaryPath = `/bin/${commandName}`;
  return findCommandByPath(binaryPath);
}

function listDirectory(node, directoryPath) {
  return Object.entries(node.children)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, child]) => {
      const value = child.type === "directory" ? `${name}/` : name;
      const childPath =
        directoryPath === "/" ? `/${name}` : `${directoryPath}/${name}`;
      return createEntryToken(value, getEntryType(child, childPath));
    });
}

function getEntryType(node, path) {
  if (node.type === "directory") {
    return "directory";
  }

  if (path.startsWith("/bin/")) {
    return "executable";
  }

  return "file";
}

function createLineElement(value, className = "terminal__line") {
  const line = document.createElement("p");
  line.className = className;
  const renderedValue = typeof value === "object" && value !== null ? value.value : String(value);
  const segments = renderedValue.split(urlPattern);

  segments.forEach((segment) => {
    if (!segment) {
      return;
    }

    if (/^https?:\/\//.test(segment)) {
      const link = document.createElement("a");
      link.className = "terminal__link";
      link.href = segment;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.textContent = segment;
      line.append(link);
      return;
    }

    line.append(segment);
  });

  if (typeof value === "object" && value?.type === "entry") {
    line.classList.add(`terminal__entry--${value.entryType}`);
  }

  return line;
}

function addPromptLine(value, promptText) {
  const historyLine = document.createElement("p");
  historyLine.className = "terminal__line";
  historyLine.dataset.lineCount = "1";

  const prompt = document.createElement("span");
  prompt.className = "terminal__prompt";
  prompt.textContent = promptText;

  historyLine.append(prompt, value);
  terminalHistory.append(historyLine);
}

function addOutputLines(lines) {
  if (!lines.length) {
    return;
  }

  const outputGroup = document.createElement("div");
  outputGroup.className = "terminal__output";
  outputGroup.dataset.lineCount = String(lines.length);

  lines.forEach((line) => {
    outputGroup.append(createLineElement(line));
  });

  terminalHistory.append(outputGroup);
}

function clearHistory() {
  terminalHistory.replaceChildren();
  isPinnedToBottom = true;
}

function getHistoryLineCount() {
  return Array.from(terminalHistory.children).reduce((total, child) => {
    return total + Number(child.dataset.lineCount ?? 0);
  }, 0);
}

function trimHistory() {
  let totalLines = getHistoryLineCount();

  while (totalLines > maxHistoryLines && terminalHistory.firstElementChild) {
    totalLines -= Number(terminalHistory.firstElementChild.dataset.lineCount ?? 0);
    terminalHistory.firstElementChild.remove();
  }
}

function commitHistory() {
  trimHistory();

  if (isPinnedToBottom) {
    scrollToBottom();
  }
}

function parseCommand(rawValue) {
  const tokens = rawValue.trim().split(/\s+/).filter(Boolean);
  return {
    name: tokens[0] ?? "",
    args: tokens.slice(1),
  };
}

function runCommand(rawValue) {
  const { name, args } = parseCommand(rawValue);

  if (!name) {
    return output([]);
  }

  const command = resolveCommand(name);

  if (!command) {
    return output([unknownCommandMessage]);
  }

  return command.run(args, rawValue);
}

function submitCommand(rawValue) {
  const promptText = getPromptText();
  const result = runCommand(rawValue);

  if (result.type !== "clear" && result.type !== "close") {
    addPromptLine(rawValue, promptText);
  }

  handleCommandResult(result);
  commitHistory();
  terminalInput.value = "";
  terminalText.textContent = "";
}

function handleCommandResult(result) {
  if (result.type === "clear") {
    clearHistory();
    return;
  }

  if (result.type === "close") {
    closeTerminal();
    return;
  }

  addOutputLines(result.lines);
}

function focusInput() {
  terminalInput.focus({ preventScroll: true });
}

async function runBootSequence() {
  const sequenceToken = ++bootSequenceToken;
  needsBootSequence = false;
  setInteractiveState(false);
  terminalInput.value = "";
  terminalText.textContent = "";
  focusInput();

  const stepDuration = bootDurationMs / bootCommand.length;

  for (const character of bootCommand) {
    if (sequenceToken !== bootSequenceToken || terminal.hidden) {
      return;
    }

    terminalInput.value += character;
    terminalText.textContent = terminalInput.value;
    scrollToBottom();
    await sleep(stepDuration);
  }

  if (sequenceToken !== bootSequenceToken || terminal.hidden) {
    return;
  }

  await sleep(120);

  if (sequenceToken !== bootSequenceToken || terminal.hidden) {
    return;
  }

  submitCommand(bootCommand);
  setInteractiveState(true);
  focusInput();
}

terminal.addEventListener("click", focusInput);
terminal.addEventListener("focus", focusInput);
terminalLauncher.addEventListener("click", openTerminal);
closeButton.addEventListener("click", closeTerminal);
minimizeButton.addEventListener("click", minimizeTerminal);
maximizeButton.addEventListener("click", toggleMaximize);
themeToggle.addEventListener("click", () => {
  const resolvedTheme = getResolvedTheme();
  themePreference = resolvedTheme === "dark" ? "light" : "dark";
  window.localStorage.setItem(themeStorageKey, themePreference);
  applyTheme();
});

terminalInput.addEventListener("input", syncCurrentLine);

terminalInput.addEventListener("keydown", (event) => {
  if (!isInteractive) {
    event.preventDefault();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  submitCommand(terminalInput.value);
  syncCurrentLine();
});

applyTheme();
syncWindowState();
syncPrompt();
resetTerminalState({ shouldBootSequence: true });
openTerminal();
