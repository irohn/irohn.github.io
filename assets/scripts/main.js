const terminal = document.querySelector(".terminal");
const terminalBody = document.querySelector(".terminal__body");
const terminalInput = document.querySelector("#terminal-input");
const terminalText = document.querySelector("#terminal-text");
const terminalHistory = document.querySelector("#terminal-history");
const promptElements = document.querySelectorAll(".terminal__prompt");

const siteName = "site";
const homeDirectory = "/home/guest";
const unknownCommandMessage =
  "Command not found. Type `help` to see available commands.";
const permissionDeniedMessage =
  "User `guest` has no permissions to manipulate the filesystem";
const urlPattern = /(https?:\/\/[^\s]+)/g;
const maxHistoryLines = 1000;

let currentDirectory = homeDirectory;

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
  help: {
    description: "List available commands.",
    example: "help",
    builtin: true,
    run() {
      return output(buildHelpLines());
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
        "I mainly do back-end stuff.",
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
        return output([basename(resolvedPath)]);
      }

      return output(listDirectory(node));
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
      const command = commands[target];

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

function buildHelpLines() {
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

function syncCurrentLine() {
  terminalText.textContent = terminalInput.value;
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

function listDirectory(node) {
  return Object.entries(node.children)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, child]) => (child.type === "directory" ? `${name}/` : name));
}

function createLineElement(value, className = "terminal__line") {
  const line = document.createElement("p");
  line.className = className;
  const segments = String(value).split(urlPattern);

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
  terminalBody.scrollTop = terminalBody.scrollHeight;
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

  const command = commands[name];

  if (!command) {
    return output([unknownCommandMessage]);
  }

  return command.run(args, rawValue);
}

function handleCommandResult(result) {
  if (result.type === "clear") {
    clearHistory();
    return;
  }

  addOutputLines(result.lines);
}

function focusInput() {
  terminalInput.focus({ preventScroll: true });
}

terminal.addEventListener("click", focusInput);
terminal.addEventListener("focus", focusInput);

terminalInput.addEventListener("input", syncCurrentLine);

terminalInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const inputValue = terminalInput.value;
  const promptText = getPromptText();
  const result = runCommand(inputValue);

  if (result.type !== "clear") {
    addPromptLine(inputValue, promptText);
  }

  handleCommandResult(result);
  commitHistory();
  terminalInput.value = "";
  syncCurrentLine();
});

syncPrompt();
focusInput();
syncCurrentLine();
