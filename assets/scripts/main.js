const svgNamespace = "http://www.w3.org/2000/svg";
const wallpaperCanvas = document.querySelector("#wallpaper-canvas");
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
const browserLauncher = document.querySelector("#browser-launcher");
const wallpaperLauncher = document.querySelector("#wallpaper-launcher");
const closeButton = document.querySelector("#terminal-close");
const minimizeButton = document.querySelector("#terminal-minimize");
const maximizeButton = document.querySelector("#terminal-maximize");
const browser = document.querySelector("#browser-window");
const browserAddress = document.querySelector("#browser-address");
const browserFrame = document.querySelector("#browser-frame");
const browserCloseButton = document.querySelector("#browser-close");
const browserMinimizeButton = document.querySelector("#browser-minimize");
const browserMaximizeButton = document.querySelector("#browser-maximize");
const wallpaperWindow = document.querySelector("#wallpaper-window");
const wallpaperCloseButton = document.querySelector("#wallpaper-close");
const wallpaperMinimizeButton = document.querySelector("#wallpaper-minimize");
const wallpaperMaximizeButton = document.querySelector("#wallpaper-maximize");
const wallpaperOptions = document.querySelectorAll(".wallpaper-option");
const accentPresetButtons = document.querySelectorAll(".accent-preset");
const themeToggle = document.querySelector("#theme-toggle");

const siteName = "irohn.net";
const homeDirectory = "/home/guest";
const browserHomePage = "links.html";
const unknownCommandMessage =
  "Command not found. Type `help commands` to see available commands.";
const permissionDeniedMessage =
  "Error: Permission denied for user: guest";
const urlPattern = /(https?:\/\/[^\s]+)/g;
const maxHistoryLines = 1000;
const bootCommand = "whoami";
const bootDurationMs = 1000;
const themeStorageKey = "irohn-theme-preference";
const wallpaperStorageKey = "irohn-wallpaper-preference";
const accentPresetStorageKey = "irohn-accent-preset";
const aliases = {
  www: "cd /srv/irohn.net",
};
const accentPresets = {
  white: "#f5f5f5",
  red: "#ff6b6b",
  green: "#7fe36a",
  blue: "#79aef8",
  yellow: "#f2d15c",
  cyan: "#67dce6",
  purple: "#9b88f7",
  magenta: "#f071c4",
};
const wallpapers = {
  default: { label: "Lines" },
  bubbles: { label: "Bubbles" },
  rain: { label: "Rain" },
};
const bashrcContent = `# ~/.bashrc: executed by bash(1)

# If not running interactively, don't do anything
[ -z "$PS1" ] && return

# History size
HISTSIZE=1000

alias www="cd /srv/irohn.net"`;

let currentDirectory = homeDirectory;
let isPinnedToBottom = true;
let isInteractive = false;
let needsBootSequence = true;
let bootSequenceToken = 0;
let themePreference = window.localStorage.getItem(themeStorageKey) ?? "dark";
let wallpaperPreference = window.localStorage.getItem(wallpaperStorageKey) ?? "default";
let accentPreset = window.localStorage.getItem(accentPresetStorageKey) ?? "white";
let terminalWindowState = "closed";
let browserWindowState = "closed";
let wallpaperWindowState = "closed";
let activeWindow = null;
let isTerminalMaximized = false;
let isBrowserMaximized = false;
let isWallpaperMaximized = false;
let browserNavigationToken = 0;

const fileSystem = createDirectory({
  home: createDirectory({
    guest: createDirectory({
      ".bashrc": createFile(bashrcContent),
      Documents: createDirectory({}),
      Downloads: createDirectory({}),
      Games: createDirectory({}),
    }),
  }),
  srv: createDirectory({
    "irohn.net": createDirectory({
      "CNAME": createFile("irohn.net"),
      "README.md": createFile("Personal website repository"),
      "index.html": createFile("Static site entrypoint"),
      "links.html": createFile("Browser home page with social links"),
      assets: createDirectory({
        styles: createDirectory({
          "main.css": createFile("Main site stylesheet"),
        }),
        scripts: createDirectory({
          "main.js": createFile("Main site behavior"),
        }),
      }),
    }),
  }),
  bin: createDirectory({
    cd: createFile("binary"),
    ls: createFile("binary"),
    mkdir: createFile("binary"),
    cat: createFile("binary"),
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
        "My name is Ori,",
        "I mostly do Software Development, Devops Engineering & Automations.",
        "Feel free to explore here to find out more.",
      ]);
    },
  },
  pwd: {
    description: "Print the current working directory.",
    example: "pwd",
    builtin: true,
    run() {
      return output([currentDirectory]);
    },
  },
  cd: {
    description: "Change the current working directory.",
    example: "cd /srv/irohn.net",
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
    example: "cat /home/guest/.bashrc",
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
    builtin: true,
    run(args) {
      if (!args.length) {
        return output(["which: missing command operand"]);
      }

      const target = args[0];
      const aliasCommand = aliases[target];

      if (aliasCommand) {
        return output([`${target}: aliased to ${aliasCommand}`]);
      }

      const command = resolveCommand(target);

      if (!command) {
        return output([`${target} not found`]);
      }

      if (command.path) {
        return output([command.path]);
      }

      if (command.builtin) {
        return output([`${target}: shell built-in command`]);
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

function getPromptParts() {
  const path = currentDirectory.startsWith(`${homeDirectory}/`)
    ? currentDirectory.replace(homeDirectory, "~")
    : currentDirectory === homeDirectory
      ? "~"
      : currentDirectory;

  return {
    userHost: `guest@${siteName}`,
    separator: ":",
    path,
    sigil: "$",
  };
}

function createPromptElement() {
  const prompt = document.createElement("span");
  prompt.className = "terminal__prompt";

  const { userHost, separator, path, sigil } = getPromptParts();
  const segments = [
    ["terminal__prompt-userhost", userHost],
    ["terminal__prompt-separator", separator],
    ["terminal__prompt-path", path],
    ["terminal__prompt-sigil", sigil],
  ];

  segments.forEach(([className, value]) => {
    const segment = document.createElement("span");
    segment.className = className;
    segment.textContent = value;
    prompt.append(segment);
  });

  return prompt;
}

function syncPrompt() {
  promptElements.forEach((promptElement) => {
    promptElement.replaceChildren(...createPromptElement().childNodes);
  });
}

function scrollToBottom() {
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function getResolvedTheme() {
  return themePreference === "light" ? "light" : "dark";
}

function getResolvedWallpaper() {
  return wallpapers[wallpaperPreference] ? wallpaperPreference : "default";
}

function createSvgElement(tagName, attributes = {}) {
  const element = document.createElementNS(svgNamespace, tagName);

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, String(value));
  });

  return element;
}

function appendAnimate(element, attributeName, values, duration) {
  element.append(
    createSvgElement("animate", {
      attributeName,
      values,
      dur: duration,
      repeatCount: "indefinite",
    })
  );
}

function getWallpaperPalette(theme) {
  const accentColor = accentPresets[accentPreset] ?? accentPresets.white;

  if (theme === "light") {
    return {
      background: "#f3f5f8",
      accent: "#1e2530",
      muted: mixHexColors(accentColor, "#456c92", 0.28),
      soft: mixHexColors(accentColor, "#f3f5f8", 0.18),
      haze: "rgba(255, 255, 255, 0.28)",
    };
  }

  return {
    background: "#101112",
    accent: "#eef3f7",
    muted: mixHexColors(accentColor, "#7fa8c9", 0.32),
    soft: mixHexColors(accentColor, "#101112", 0.14),
    haze: "rgba(255, 255, 255, 0.14)",
  };
}

function hexToRgb(hexColor) {
  const normalized = /^#[0-9a-f]{6}$/i.test(String(hexColor ?? "").trim())
    ? String(hexColor).trim().toLowerCase()
    : null;

  if (!normalized) {
    return null;
  }

  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ red, green, blue }) {
  return `#${[red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexColors(leftHex, rightHex, ratio) {
  const left = hexToRgb(leftHex);
  const right = hexToRgb(rightHex);

  if (!left || !right) {
    return leftHex;
  }

  return rgbToHex({
    red: left.red + (right.red - left.red) * ratio,
    green: left.green + (right.green - left.green) * ratio,
    blue: left.blue + (right.blue - left.blue) * ratio,
  });
}

function syncAccentControls() {
  accentPresetButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.accent === accentPreset));
  });
}

function applyAccentTheme() {
  const accentColor = accentPresets[accentPreset] ?? accentPresets.white;
  const accentRgb = hexToRgb(accentColor) ?? { red: 245, green: 245, blue: 245 };

  document.documentElement.style.setProperty("--window-neutral-accent", accentColor);
  document.documentElement.style.setProperty(
    "--window-neutral-accent-soft",
    `rgba(${accentRgb.red}, ${accentRgb.green}, ${accentRgb.blue}, 0.14)`
  );
  document.documentElement.style.setProperty(
    "--window-neutral-accent-border",
    `rgba(${accentRgb.red}, ${accentRgb.green}, ${accentRgb.blue}, 0.3)`
  );
  document.documentElement.style.setProperty("--desktop-app-indicator-active", accentColor);
}

function renderLineWallpaper(root, theme) {
  const palette = getWallpaperPalette(theme);
  const background = createSvgElement("rect", {
    width: 1600,
    height: 1000,
    fill: palette.background,
  });
  const group = createSvgElement("g", {
    stroke: palette.accent,
    "stroke-linecap": "round",
    "stroke-width": 3,
    opacity: theme === "light" ? 0.34 : 0.38,
  });
  const definitions = [
    [120, 180, 300, 150, "300;360;320;300", "150;138;168;150", "13s", "11s"],
    [420, 120, 520, 260, "520;575;545;520", "260;330;290;260", "16s", "14s"],
    [760, 110, 940, 108, "940;1020;980;940", null, "12s", null],
    [1130, 160, 1230, 280, "1230;1290;1250;1230", "280;350;320;280", "15s", "12s"],
    [1380, 120, 1510, 170, "1510;1565;1530;1510", "170;200;185;170", "10s", "9s"],
    [180, 410, 280, 520, "280;350;315;280", "520;595;560;520", "14s", "15s"],
    [520, 460, 710, 388, "710;800;760;710", "388;350;372;388", "17s", "13s"],
    [905, 430, 1060, 600, "1060;1140;1105;1060", "600;690;650;600", "18s", "12s"],
    [1280, 470, 1435, 415, "1435;1510;1475;1435", "415;390;404;415", "11s", "14s"],
    [160, 760, 360, 750, "360;450;405;360", null, "15s", null],
    [460, 760, 590, 900, "590;650;620;590", "900;970;935;900", "12s", "16s"],
    [770, 760, 960, 830, "960;1045;1000;960", "830;865;846;830", "19s", "13s"],
    [1115, 780, 1200, 650, "1200;1240;1222;1200", "650;585;615;650", "10s", "11s"],
    [1360, 800, 1510, 915, "1510;1568;1542;1510", "915;975;945;915", "14s", "12s"],
  ];

  definitions.forEach(([x1, y1, x2, y2, x2Values, y2Values, xDur, yDur]) => {
    const line = createSvgElement("line", { x1, y1, x2, y2 });
    appendAnimate(line, "x2", x2Values, xDur);

    if (y2Values && yDur) {
      appendAnimate(line, "y2", y2Values, yDur);
    }

    group.append(line);
  });

  root.append(background, group);
}

function renderBubbleWallpaper(root, theme) {
  const palette = getWallpaperPalette(theme);
  root.append(
    createSvgElement("rect", {
      width: 1600,
      height: 1000,
      fill: palette.background,
    })
  );

  const defs = createSvgElement("defs");
  const bubblesGroup = createSvgElement("g");
  const particlesGroup = createSvgElement("g", { opacity: 0.55 });
  const bubbles = [
    [140, 1040, 18, 180, 12],
    [250, 1080, 26, 220, 15],
    [360, 1060, 14, 150, 11],
    [520, 1090, 22, 230, 14],
    [650, 1070, 17, 210, 10],
    [760, 1100, 28, 160, 16],
    [905, 1080, 20, 240, 13],
    [1040, 1060, 24, 190, 12],
    [1180, 1090, 15, 230, 11],
    [1295, 1050, 19, 175, 14],
    [1415, 1085, 23, 210, 15],
    [1510, 1105, 16, 170, 12],
  ];

  bubbles.forEach(([cx, cy, radius, peak, duration], index) => {
    const bubbleColor = index % 2 === 0 ? palette.muted : palette.soft;
    const gradientId = `bubble-gradient-${theme}-${index}`;
    const motionClass = radius <= 16 ? "small" : radius <= 22 ? "medium" : "large";
    const wobbleDuration =
      motionClass === "small"
        ? (1.85 + (index % 3) * 0.16).toFixed(2)
        : motionClass === "medium"
          ? (1.55 + (index % 4) * 0.18).toFixed(2)
          : (1.35 + (index % 4) * 0.16).toFixed(2);
    const tiltRange =
      motionClass === "small"
        ? 0.4 + (index % 2) * 0.18
        : motionClass === "medium"
          ? 0.9 + (index % 3) * 0.3
          : 1.3 + (index % 4) * 0.35;
    const angleDrift =
      motionClass === "small"
        ? (index % 2 === 0 ? 1 : -1) * (0.8 + (index % 2) * 0.35)
        : motionClass === "medium"
          ? (index % 2 === 0 ? 1 : -1) * (1.8 + (index % 3) * 0.7)
          : (index % 2 === 0 ? 1 : -1) * (2.8 + (index % 4) * 0.9);
    const gradient = createSvgElement("radialGradient", {
      id: gradientId,
      cx: `${32 + (index % 4) * 4}%`,
      cy: `${30 + (index % 3) * 5}%`,
      r: "78%",
      fx: `${28 + (index % 4) * 4}%`,
      fy: `${26 + (index % 3) * 4}%`,
    });
    gradient.append(
      createSvgElement("stop", {
        offset: "0%",
        "stop-color": palette.accent,
        "stop-opacity": theme === "light" ? 0.22 : 0.16,
      }),
      createSvgElement("stop", {
        offset: "52%",
        "stop-color": bubbleColor,
        "stop-opacity": theme === "light" ? 0.12 : 0.1,
      }),
      createSvgElement("stop", {
        offset: "100%",
        "stop-color": bubbleColor,
        "stop-opacity": theme === "light" ? 0.04 : 0.032,
      })
    );
    defs.append(gradient);

    const bubble = createSvgElement("ellipse", {
      cx,
      cy,
      rx:
        motionClass === "large"
          ? radius * 1.05
          : motionClass === "medium"
            ? radius * 1.01
            : radius * 0.99,
      ry:
        motionClass === "large"
          ? radius * 0.95
          : motionClass === "medium"
            ? radius * 1.0
            : radius * 1.01,
      fill: `url(#${gradientId})`,
      stroke: palette.accent,
      "stroke-width": 1.15 + (index % 3) * 0.28,
      opacity: 0.52,
    });
    appendAnimate(
      bubble,
      "rx",
      motionClass === "small"
        ? `${(radius * 0.99).toFixed(2)};${(radius * 1.01).toFixed(2)};${(radius * 0.98).toFixed(2)};${(radius * 0.99).toFixed(2)}`
        : motionClass === "medium"
          ? `${(radius * 1.01).toFixed(2)};${(radius * 1.05).toFixed(2)};${(radius * 0.98).toFixed(2)};${(radius * 1.02).toFixed(2)};${(radius * 1.01).toFixed(2)}`
          : `${(radius * 1.05).toFixed(2)};${(radius * 1.12).toFixed(2)};${(radius * 1.0).toFixed(2)};${(radius * 1.08).toFixed(2)};${(radius * 1.05).toFixed(2)}`,
      `${wobbleDuration}s`
    );
    appendAnimate(
      bubble,
      "ry",
      motionClass === "small"
        ? `${(radius * 1.01).toFixed(2)};${(radius * 0.99).toFixed(2)};${(radius * 1.02).toFixed(2)};${(radius * 1.01).toFixed(2)}`
        : motionClass === "medium"
          ? `${(radius * 1.0).toFixed(2)};${(radius * 0.96).toFixed(2)};${(radius * 1.04).toFixed(2)};${(radius * 0.99).toFixed(2)};${(radius * 1.0).toFixed(2)}`
          : `${(radius * 0.95).toFixed(2)};${(radius * 0.9).toFixed(2)};${(radius * 1.0).toFixed(2)};${(radius * 0.93).toFixed(2)};${(radius * 0.95).toFixed(2)}`,
      `${(Number(wobbleDuration) * 0.92).toFixed(2)}s`
    );
    appendAnimate(bubble, "cy", `${cy};${peak};-140`, `${duration}s`);
    bubble.append(
      createSvgElement("animate", {
        attributeName: "cx",
        values: `${cx};${cx + angleDrift}`,
        dur: `${duration}s`,
        repeatCount: "indefinite",
        calcMode: "linear",
      })
    );
    appendAnimate(
      bubble,
      "opacity",
      `0;0.56;${index % 10 === 0 ? 0.18 : 0.56};0`,
      `${duration}s`
    );
    bubble.append(
      createSvgElement("animateTransform", {
        attributeName: "transform",
        type: "rotate",
        values:
          motionClass === "small"
            ? `0 ${cx} ${cy};${tiltRange} ${cx} ${cy};0 ${cx} ${cy}`
            : `0 ${cx} ${cy};${tiltRange} ${cx} ${cy};${-tiltRange * 0.3} ${cx} ${cy};0 ${cx} ${cy}`,
        dur: `${(Number(wobbleDuration) * 1.05).toFixed(2)}s`,
        repeatCount: "indefinite",
      })
    );
    bubblesGroup.append(bubble);

    if ((index + 1) % 10 === 0) {
      for (let particleIndex = 0; particleIndex < 6; particleIndex += 1) {
        const angle = (Math.PI * 2 * particleIndex) / 6;
        const px = cx + Math.cos(angle) * 26;
        const py = peak + Math.sin(angle) * 26;
        const particle = createSvgElement("circle", {
          cx,
          cy: peak,
          r: 1.8,
          fill: palette.accent,
          opacity: 0,
        });
        appendAnimate(particle, "cx", `${cx};${px}`, "1.2s");
        appendAnimate(particle, "cy", `${peak};${py}`, "1.2s");
        appendAnimate(particle, "opacity", "0;0;0.7;0", "1.2s");
        appendAnimate(particle, "r", "1.8;1.3;0.2", "1.2s");
        particlesGroup.append(particle);
      }
    }
  });

  root.append(defs, bubblesGroup, particlesGroup);
}

function renderRainWallpaper(root, theme) {
  const palette = getWallpaperPalette(theme);
  root.append(
    createSvgElement("rect", {
      width: 1600,
      height: 1000,
      fill: palette.background,
    })
  );

  const rainGroup = createSvgElement("g", {
    stroke: palette.accent,
    "stroke-linecap": "round",
    opacity: theme === "light" ? 0.26 : 0.28,
  });
  const drops = Array.from({ length: 28 }, (_, index) => {
    const x = 40 + index * 58;
    const top = -120 - (index % 6) * 60;
    const length = 120 + (index % 5) * 28;
    const duration = (0.9 + (index % 6) * 0.14) / 1.5;
    const width = 1.3 + (index % 4) * 0.4;
    return { x, top, length, duration, width };
  });

  drops.forEach(({ x, top, length, duration, width }, index) => {
    const line = createSvgElement("line", {
      x1: x,
      y1: top,
      x2: x - 18,
      y2: top + length,
      "stroke-width": width,
    });
    appendAnimate(line, "y1", `${top};${1160 + top}`, `${duration}s`);
    appendAnimate(line, "y2", `${top + length};${1160 + top + length}`, `${duration}s`);
    appendAnimate(line, "stroke-width", `${width};${width + 0.9};${width}`, `${duration * 1.4}s`);
    appendAnimate(
      line,
      "opacity",
      `0;${0.22 + (index % 5) * 0.05};${0.22 + (index % 5) * 0.05};0`,
      `${duration}s`
    );
    rainGroup.append(line);
  });

  root.append(rainGroup);
}

function syncWallpaperOptions() {
  const wallpaperType = getResolvedWallpaper();

  wallpaperOptions.forEach((option) => {
    option.setAttribute("aria-pressed", String(option.dataset.wallpaper === wallpaperType));
  });
}

function applyWallpaper() {
  const theme = getResolvedTheme();
  const wallpaperType = getResolvedWallpaper();

  wallpaperCanvas.replaceChildren();

  if (wallpaperType === "bubbles") {
    renderBubbleWallpaper(wallpaperCanvas, theme);
  } else if (wallpaperType === "rain") {
    renderRainWallpaper(wallpaperCanvas, theme);
  } else {
    renderLineWallpaper(wallpaperCanvas, theme);
  }

  syncWallpaperOptions();
}

function applyTheme() {
  const resolvedTheme = getResolvedTheme();
  document.documentElement.dataset.theme = resolvedTheme;
  themeToggle.setAttribute("aria-pressed", String(resolvedTheme === "light"));
  themeToggle.setAttribute(
    "aria-label",
    `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`
  );
  applyAccentTheme();
  applyWallpaper();
}

function setWallpaperPreference(value) {
  if (!wallpapers[value]) {
    return;
  }

  wallpaperPreference = value;
  window.localStorage.setItem(wallpaperStorageKey, wallpaperPreference);
  applyWallpaper();
}

function setAccentPreset(value) {
  if (!accentPresets[value]) {
    syncAccentControls();
    return false;
  }

  accentPreset = value;
  window.localStorage.setItem(accentPresetStorageKey, accentPreset);
  syncAccentControls();
  applyAccentTheme();
  applyWallpaper();
  return true;
}

function setInteractiveState(value) {
  isInteractive = value;
}

function setActiveWindow(windowName) {
  activeWindow = windowName;
  syncWindowState();
}

function activateVisibleWindow() {
  if (wallpaperWindowState === "open" && !wallpaperWindow.hidden) {
    setActiveWindow("wallpaper");
    wallpaperWindow.focus({ preventScroll: true });
    return;
  }

  if (browserWindowState === "open" && !browser.hidden) {
    setActiveWindow("browser");
    browser.focus({ preventScroll: true });
    return;
  }

  if (terminalWindowState === "open" && !terminal.hidden) {
    focusInput();
    return;
  }

  setActiveWindow(null);
}

function isTerminalFocused() {
  return terminalWindowState === "open" && activeWindow === "terminal" && document.hasFocus();
}

function isBrowserFocused() {
  return browserWindowState === "open" && activeWindow === "browser" && document.hasFocus();
}

function isWallpaperFocused() {
  return (
    wallpaperWindowState === "open" && activeWindow === "wallpaper" && document.hasFocus()
  );
}

function getWindowIndicatorState(windowState, isFocused) {
  if (windowState === "closed") {
    return "closed";
  }

  return isFocused ? "focused" : "inactive";
}

function minimizeOtherWindows(targetWindow) {
  if (targetWindow !== "terminal" && terminalWindowState === "open" && !terminal.hidden) {
    terminalWindowState = "minimized";
    terminal.hidden = true;
    terminalInput.blur();
  }

  if (targetWindow !== "browser" && browserWindowState === "open" && !browser.hidden) {
    browserWindowState = "minimized";
    browser.hidden = true;
  }

  if (
    targetWindow !== "wallpaper" &&
    wallpaperWindowState === "open" &&
    !wallpaperWindow.hidden
  ) {
    wallpaperWindowState = "minimized";
    wallpaperWindow.hidden = true;
  }
}

function syncWindowState() {
  const terminalFocused = isTerminalFocused();
  const browserFocused = isBrowserFocused();
  const wallpaperFocused = isWallpaperFocused();
  const isAnyWindowMaximized =
    isTerminalMaximized || isBrowserMaximized || isWallpaperMaximized;

  terminal.classList.toggle("terminal--maximized", isTerminalMaximized);
  terminal.classList.toggle("terminal--focused", terminalFocused);
  terminal.classList.toggle("terminal--inactive", !terminalFocused);
  browser.classList.toggle("browser-window--maximized", isBrowserMaximized);
  browser.classList.toggle("browser-window--focused", browserFocused);
  browser.classList.toggle("browser-window--inactive", !browserFocused);
  wallpaperWindow.classList.toggle("wallpaper-window--maximized", isWallpaperMaximized);
  wallpaperWindow.classList.toggle("wallpaper-window--focused", wallpaperFocused);
  wallpaperWindow.classList.toggle("browser-window--inactive", !wallpaperFocused);
  pageShell.classList.toggle("page-shell--maximized", isAnyWindowMaximized);
  desktopDock.hidden = isAnyWindowMaximized;
  themeToggle.hidden = isAnyWindowMaximized;
  terminalLauncher.dataset.windowState = getWindowIndicatorState(
    terminalWindowState,
    terminalFocused
  );
  browserLauncher.dataset.windowState = getWindowIndicatorState(
    browserWindowState,
    browserFocused
  );
  wallpaperLauncher.dataset.windowState = getWindowIndicatorState(
    wallpaperWindowState,
    wallpaperFocused
  );
}

function openTerminal() {
  minimizeOtherWindows("terminal");
  terminalWindowState = "open";
  terminal.hidden = false;
  setActiveWindow("terminal");
  syncWindowState();
  focusInput();
  scrollToBottom();

  if (needsBootSequence) {
    runBootSequence();
  }
}

function minimizeTerminal() {
  terminalWindowState = "minimized";
  if (activeWindow === "terminal") {
    activeWindow = null;
  }
  terminal.hidden = true;
  activateVisibleWindow();
}

function resetTerminalState({ shouldBootSequence = false } = {}) {
  currentDirectory = homeDirectory;
  isPinnedToBottom = true;
  isTerminalMaximized = false;
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
  terminalWindowState = "closed";
  resetTerminalState();
  minimizeTerminal();
  terminalWindowState = "closed";
  if (activeWindow === "terminal") {
    activeWindow = null;
  }
  activateVisibleWindow();
}

function toggleMaximize() {
  isTerminalMaximized = !isTerminalMaximized;
  setActiveWindow("terminal");
  syncWindowState();
  focusInput();
  scrollToBottom();
}

function isExternalBrowserTarget(target) {
  return /^https?:\/\//i.test(target);
}

function normalizeBrowserTarget(value) {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return browserHomePage;
  }

  if (
    trimmedValue.startsWith("/") ||
    trimmedValue.startsWith("./") ||
    trimmedValue.startsWith("../")
  ) {
    return trimmedValue;
  }

  if (!trimmedValue.includes("://")) {
    if (
      /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(trimmedValue) &&
      !/\.html?(\/.*)?$/i.test(trimmedValue)
    ) {
      return `https://${trimmedValue}`;
    }

    return trimmedValue;
  }

  return trimmedValue;
}

function navigateBrowser(rawTarget = browserAddress.textContent) {
  const target = normalizeBrowserTarget(rawTarget);
  const navigationToken = ++browserNavigationToken;

  browserAddress.textContent = target;
  browserFrame.src = target;

  if (!isExternalBrowserTarget(target)) {
    return;
  }

  const fallbackTimer = window.setTimeout(() => {
    if (navigationToken !== browserNavigationToken) {
      return;
    }

    browserFrame.removeAttribute("src");
    window.open(target, "_blank", "noopener,noreferrer");
  }, 1400);

  browserFrame.addEventListener(
    "load",
    () => {
      if (navigationToken !== browserNavigationToken) {
        return;
      }

      window.clearTimeout(fallbackTimer);
    },
    { once: true }
  );
}

function openBrowser(target = browserHomePage) {
  const initialTarget =
    typeof target === "string" || target == null ? target ?? browserHomePage : browserHomePage;

  minimizeOtherWindows("browser");
  browserWindowState = "open";
  browser.hidden = false;
  setActiveWindow("browser");
  syncWindowState();
  browser.focus({ preventScroll: true });
  window.requestAnimationFrame(() => {
    if (browserWindowState !== "open" || browser.hidden) {
      return;
    }

    navigateBrowser(initialTarget);
  });
}

function openWallpaperWindow() {
  minimizeOtherWindows("wallpaper");
  wallpaperWindowState = "open";
  wallpaperWindow.hidden = false;
  setActiveWindow("wallpaper");
  syncWindowState();
  wallpaperWindow.focus({ preventScroll: true });
}

function bindBrowserFrameFocus() {
  if (!browserFrame) {
    return;
  }

  browserFrame.addEventListener("focus", () => {
    if (browserWindowState === "open") {
      setActiveWindow("browser");
    }
  });

  browserFrame.addEventListener("load", () => {
    if (browserWindowState !== "open") {
      return;
    }

    setActiveWindow("browser");

    try {
      const frameWindow = browserFrame.contentWindow;
      const frameDocument = frameWindow?.document;

      if (!frameWindow || !frameDocument) {
        return;
      }

      frameWindow.addEventListener("focus", () => {
        if (browserWindowState === "open") {
          setActiveWindow("browser");
        }
      });

      frameDocument.addEventListener("pointerdown", () => {
        if (browserWindowState === "open") {
          setActiveWindow("browser");
        }
      });
    } catch (_error) {
      // Cross-origin frames are expected to block access.
    }
  });
}

function minimizeBrowser() {
  browserWindowState = "minimized";
  if (activeWindow === "browser") {
    activeWindow = null;
  }

  browser.hidden = true;
  activateVisibleWindow();
}

function minimizeWallpaperWindow() {
  wallpaperWindowState = "minimized";

  if (activeWindow === "wallpaper") {
    activeWindow = null;
  }

  wallpaperWindow.hidden = true;
  activateVisibleWindow();
}

function closeBrowser() {
  browserWindowState = "closed";
  isBrowserMaximized = false;
  browserNavigationToken += 1;
  browser.hidden = true;
  browserAddress.textContent = "";
  browserFrame.removeAttribute("src");

  if (activeWindow === "browser") {
    activeWindow = null;
  }

  activateVisibleWindow();
}

function closeWallpaperWindow() {
  wallpaperWindowState = "closed";
  isWallpaperMaximized = false;
  wallpaperWindow.hidden = true;

  if (activeWindow === "wallpaper") {
    activeWindow = null;
  }

  activateVisibleWindow();
}

function toggleBrowserMaximize() {
  isBrowserMaximized = !isBrowserMaximized;
  setActiveWindow("browser");
  syncWindowState();
  browser.focus({ preventScroll: true });
}

function toggleWallpaperMaximize() {
  isWallpaperMaximized = !isWallpaperMaximized;
  setActiveWindow("wallpaper");
  syncWindowState();
  wallpaperWindow.focus({ preventScroll: true });
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

function addPromptLine(value) {
  const historyLine = document.createElement("p");
  historyLine.className = "terminal__line";
  historyLine.dataset.lineCount = "1";

  const prompt = createPromptElement();

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

  const aliasCommand = aliases[name];

  if (aliasCommand) {
    const expandedCommand = [aliasCommand, ...args].filter(Boolean).join(" ");
    return runCommand(expandedCommand);
  }

  const command = resolveCommand(name);

  if (!command) {
    return output([unknownCommandMessage]);
  }

  return command.run(args, rawValue);
}

function submitCommand(rawValue) {
  const result = runCommand(rawValue);

  if (result.type !== "clear" && result.type !== "close") {
    addPromptLine(rawValue);
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
  if (terminalWindowState === "open") {
    setActiveWindow("terminal");
  }

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
browser.addEventListener("click", () => {
  if (browserWindowState === "open") {
    setActiveWindow("browser");
  }
});
browser.addEventListener("focus", () => {
  if (browserWindowState === "open") {
    setActiveWindow("browser");
  }
});
wallpaperWindow.addEventListener("click", () => {
  if (wallpaperWindowState === "open") {
    setActiveWindow("wallpaper");
  }
});
wallpaperWindow.addEventListener("focus", () => {
  if (wallpaperWindowState === "open") {
    setActiveWindow("wallpaper");
  }
});
document.addEventListener("pointerdown", (event) => {
  if (terminalWindowState === "open" && terminal.contains(event.target)) {
    setActiveWindow("terminal");
    return;
  }

  if (browserWindowState === "open" && browser.contains(event.target)) {
    setActiveWindow("browser");
    return;
  }

  if (wallpaperWindowState === "open" && wallpaperWindow.contains(event.target)) {
    setActiveWindow("wallpaper");
    return;
  }

  setActiveWindow(null);
});
document.addEventListener("focusin", (event) => {
  if (event.target === terminalInput || terminal.contains(event.target)) {
    setActiveWindow("terminal");
    return;
  }

  if (browser.contains(event.target)) {
    setActiveWindow("browser");
    return;
  }

  if (wallpaperWindow.contains(event.target)) {
    setActiveWindow("wallpaper");
    return;
  }

  setActiveWindow(null);
});
window.addEventListener("focus", syncWindowState);
window.addEventListener("blur", syncWindowState);
document.addEventListener("visibilitychange", syncWindowState);
bindBrowserFrameFocus();
terminalLauncher.addEventListener("click", openTerminal);
browserLauncher.addEventListener("click", openBrowser);
wallpaperLauncher.addEventListener("click", openWallpaperWindow);
closeButton.addEventListener("click", closeTerminal);
minimizeButton.addEventListener("click", minimizeTerminal);
maximizeButton.addEventListener("click", toggleMaximize);
browserCloseButton.addEventListener("click", closeBrowser);
browserMinimizeButton.addEventListener("click", minimizeBrowser);
browserMaximizeButton.addEventListener("click", toggleBrowserMaximize);
wallpaperCloseButton.addEventListener("click", closeWallpaperWindow);
wallpaperMinimizeButton.addEventListener("click", minimizeWallpaperWindow);
wallpaperMaximizeButton.addEventListener("click", toggleWallpaperMaximize);
wallpaperOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setWallpaperPreference(option.dataset.wallpaper);
    setActiveWindow("wallpaper");
  });
});
accentPresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAccentPreset(button.dataset.accent);
    setActiveWindow("wallpaper");
  });
});
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
syncAccentControls();
syncWindowState();
syncPrompt();
resetTerminalState({ shouldBootSequence: true });
openTerminal();
