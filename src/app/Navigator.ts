// Navigator.ts — two-pane navigator with search/path box and preview

import {
  CliRenderer,
  GroupRenderable,
  BoxRenderable,
  TextRenderable,
  createCliRenderer,
  type ParsedKey,
  RGBA,
  getKeyHandler
} from "@opentui/core";
import { promises as fs } from "fs";
import * as path from "path";

// Import our organized modules
import { TreeMenu } from "../components";
import { OverlayInputBar } from "../components";
import { PreviewPane } from "../components";
import { TreeNode, FileItem, FileInfo } from "../types";
import {
  buildTreeFromDir,
  treeNodeToFileInfo,
  fileItemToTreeNode,
  treeNodeToFileItem,
  fileItemToFileInfo,
  listDir
} from "../utils";

let renderer: CliRenderer | null = null

let headerBox: BoxRenderable | null = null
let header: TextRenderable | null = null

let overlayInputBar: OverlayInputBar | null = null
let overlayRoot: BoxRenderable | null = null
let overlayBackdrop: BoxRenderable | null = null

let bodyBox: BoxRenderable | null = null
let bodyRow: GroupRenderable | null = null

let leftBox: BoxRenderable | null = null
let fileTree: TreeMenu | null = null

let previewPane: PreviewPane | null = null

let footerBox: BoxRenderable | null = null
let footer: TextRenderable | null = null

let currentDir = process.cwd()
let isHidingOverlay = false // Prevent circular calls

// simple focus cycling: [fileTree] (overlay manages its own focus)
const focusable: Array<TreeMenu> = []
const focusableBoxes: Array<BoxRenderable | null> = []
let focusIndex = 0

// Current tree root
let treeRoot: TreeNode | null = null

// Functions moved to utils/fileSystem.ts

async function refreshDir(dir: string) {
  currentDir = dir
  treeRoot = await buildTreeFromDir(dir)
  
  if (fileTree) {
    fileTree.setNodes([treeRoot])
    void fileTree.expandNode(treeRoot.path)
  }
  
  // No need to update overlay input - it's hidden by default
  if (previewPane) {
    previewPane.showMessage("Preview", "Select a file to preview its contents.")
  }
}

// Note: Filtering is now handled by the TreeMenu itself through the path input
// The tree structure will handle folder expansion/collapse

async function openSelection(node: TreeNode) {
  if (node.type === "folder") {
    await refreshDir(node.path)
    return
  }
  // Preview the file using the new PreviewPane
  if (previewPane) {
    const fileInfo = treeNodeToFileInfo(node)
    await previewPane.previewFile(fileInfo)
  }
}

// renderPreview function removed - replaced by PreviewPane.previewFile()

function focusUpdate() {
  focusable.forEach((el) => el.blur())
  focusableBoxes.forEach((b) => b && b.blur())
  const el = focusable[focusIndex]
  const box = focusableBoxes[focusIndex]
  if (el) el.focus()
  if (box) box.focus()
}

function handleKey(key: ParsedKey) {
  // Handle overlay first
  if (overlayRoot && overlayRoot.visible) {
    // Let overlay handle its keys (including Escape)
    if (overlayInputBar && overlayInputBar.handleKeyPress(key)) {
      return;
    }
    // Block everything else when overlay is open
    return;
  }

  // Hotkeys to show overlay (work when overlay is closed)
  if (key.ctrl && key.name === "f") {
    showOverlay();
    return;
  }

  if (key.name === "/") {
    showOverlay("/");
    return;
  }

  if (key.ctrl && (key.name === "l" || key.sequence === "\x0c")) {
    showOverlay();
    return;
  }

  // Tab navigation between components
  if (key.name === "tab") {
    focusIndex = (focusIndex + (key.shift ? -1 : 1) + focusable.length) % focusable.length;
    focusUpdate();
    return;
  }

  // All other keys fall through to components (TreeMenu handles its own keys)
}

function showOverlay(initialValue?: string) {
  if (overlayRoot && overlayInputBar) {
    overlayRoot.visible = true;
    overlayInputBar.show();
    if (initialValue) {
      overlayInputBar.setValue(initialValue);
    }
    // Explicitly blur the underlying SelectRenderable to prevent it from receiving keys
    if (fileTree && (fileTree as any).select) {
      (fileTree as any).select.blur();
    }
  }
}

function hideOverlay() {
  if (isHidingOverlay) return; // Prevent circular calls
  isHidingOverlay = true;
  
  try {
    if (overlayRoot) {
      // Only hide the root - don't touch overlayInputBar methods at all
      overlayRoot.visible = false;
    }
    
    // Clear input value manually without triggering callbacks
    if (overlayInputBar && overlayInputBar.setValue) {
      overlayInputBar.setValue("");
    }
    
    // Return focus to file tree
    if (fileTree && fileTree.focus) {
      fileTree.focus();
    }
  } catch (error) {
    console.error("Error in hideOverlay:", error);
  } finally {
    isHidingOverlay = false;
  }
}

function handleCommand(command: string, args: string[]) {
  switch (command) {
    case "help":
      if (previewPane) {
        previewPane.showHelp()
      }
      break
    case "up":
      const parentDir = path.dirname(currentDir)
      if (parentDir && parentDir !== currentDir) {
        void refreshDir(parentDir)
      }
      break
    case "home":
      void refreshDir(require("os").homedir())
      break
    case "root":
      void refreshDir(path.parse(currentDir).root)
      break
    case "search":
    case "find":
      if (previewPane) {
        previewPane.showMessage("Search", `Search functionality not implemented yet.\nArgs: ${args.join(" ")}`)
      }
      break
    default:
      if (previewPane) {
        previewPane.showMessage("Unknown Command", `Unknown command: /${command}\nType /help for available commands.`)
      }
  }
}

function wireEvents() {
  // Much simpler - just basic setup, key handling is in handleKey function
}

function buildUi(r: CliRenderer) {
  renderer = r
  r.setBackgroundColor("#0b1220")

  headerBox = new BoxRenderable("hdr-box", {
    width: "auto",
    height: 3,
    backgroundColor: "#1f2937",
    borderStyle: "single",
    borderColor: "#334155",
    flexGrow: 0,
    flexShrink: 0,
  })
  header = new TextRenderable("hdr", {
    content: "FILE SCRAM",
    fg: "#e5e7eb",
    bg: "transparent",
  })
  headerBox.add(header)

  bodyBox = new BoxRenderable("body-box", {
    width: "auto",
    height: "auto",
    minHeight: 12,
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: "#0b1220",
    border: false,
    borderStyle: "single",
    borderColor: "#334155",
  })

  bodyRow = new GroupRenderable("row", {
    width: "auto",
    height: "auto",
    flexDirection: "row",
    flexGrow: 1,
    flexShrink: 1,
  })
  bodyBox.add(bodyRow)

  leftBox = new BoxRenderable("left", {
    width: "auto",
    height: "auto",
    minWidth: 24,
    flexGrow: 1,
    flexShrink: 1,
    title: "Files",
    titleAlignment: "center",
    border:false,
    borderStyle: "single",
    borderColor: "#475569",
    focusedBorderColor: "#3b82f6",
    backgroundColor: "transparent",
  })
  fileTree = new TreeMenu("files", {
    nodes: [], // Will be populated by refreshDir
    onNodeSelected: async (node) => {
      await openSelection(node)
    },
    onNodeSelectionChanged: (node) => {
      if (previewPane) {
        const fileInfo = treeNodeToFileInfo(node)
        void previewPane.previewFile(fileInfo)
      }
    },
    onKeyPress: (key) => {
      // Debug: check if this is being called
      const shouldBlock = overlayRoot?.visible || false;
      if (shouldBlock) {
        console.log(`Blocking key: ${key.name}, overlay visible: ${overlayRoot?.visible}`);
      }
      return shouldBlock;
    },
    onGoUp: () => {
      // Go up one directory level
      const parentDir = path.dirname(currentDir)
      if (parentDir && parentDir !== currentDir) {
        void refreshDir(parentDir)
      }
    },
  })
  leftBox.add(fileTree)

  previewPane = new PreviewPane("preview", {
    title: "Preview",
    backgroundColor: "transparent",
  })

  bodyRow.add(leftBox)
  bodyRow.add(previewPane)

  // Create overlay root container (initially hidden) - make it the backdrop
  overlayRoot = new BoxRenderable("overlay-root", {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: RGBA.fromInts(5, 10, 20, 110), 
    zIndex: 1000,
    border: false,
    visible: false,
    justifyContent: "center",
    alignItems: "center",
  })


  // Create overlay input bar (no backdrop - just the input)
  overlayInputBar = new OverlayInputBar("overlay-input", {
    placeholder: "Type path, filename, or /command...",
    onPathSubmit: async (inputPath) => {
      hideOverlay();
      
      const maybe = path.isAbsolute(inputPath) ? inputPath : path.join(currentDir, inputPath)
      try {
        const st = await fs.stat(maybe)
        if (st.isDirectory()) {
          await refreshDir(path.resolve(maybe))
        } else {
          // It's a file; preview it
          if (previewPane) {
            const fileInfo: FileInfo = {
              name: path.basename(maybe),
              path: path.resolve(maybe),
              size: st.size,
              type: "file",
            }
            await previewPane.previewFile(fileInfo)
          }
        }
      } catch {
        // Path doesn't exist, try as search term
        if (previewPane) {
          previewPane.showMessage("Search", `Search for "${inputPath}" not implemented yet.`)
        }
      }
    },
    onCommand: (command, args) => {
      hideOverlay();
      handleCommand(command, args);
    },
    onInput: (value) => {
      // Could implement live filtering/suggestions here
    },
    // onCancel removed - we handle escape/enter directly in key handler to avoid circular calls
  })

  footerBox = new BoxRenderable("ftr-box", {
    width: "auto",
    height: 3,
    backgroundColor: "#0f172a",
    border:false,
    borderStyle: "single",
    borderColor: "#334155",
    flexGrow: 0,
  })
  footer = new TextRenderable("ftr", {
    content:
      "→ step into | ← step out | Space/Enter toggle | Ctrl+F search | / commands | ESC quit",
    fg: "#94a3b8",
    bg: "transparent",
  })
  footerBox.add(footer)

  // Add input bar to overlay root
  overlayRoot.add(overlayInputBar)

  // assemble
  r.root.add(headerBox)
  r.root.add(bodyBox)
  r.root.add(footerBox)
  r.root.add(overlayRoot) // Add overlay root last so it's on top

  // focusables (simplified - only tree, overlay manages itself)
  focusable.length = 0
  focusableBoxes.length = 0
  focusable.push(fileTree)
  focusableBoxes.push(leftBox)
  focusIndex = 0
  focusUpdate()

  wireEvents()
}

// Store the key handler function so we can remove it later
let globalKeyHandler: ((key: ParsedKey) => void) | null = null;

export async function run(r: CliRenderer) {
  buildUi(r)
  
  // Create and store the key handler function
  globalKeyHandler = (key: ParsedKey) => {
    try {
      // If overlay is open, only let specific keys through
      if (overlayRoot && overlayRoot.visible) {
        // Allow escape to close overlay
        if (key.name === "escape") {
          hideOverlay();
          return;
        }
        // Allow overlay to handle its own keys (but don't call overlay methods that might cause loops)
        if (key.name === "return" || key.name === "enter") {
          // Handle enter for overlay manually to avoid callback loops
          hideOverlay();
          return;
        }
        // Block ALL other keys when overlay is visible
        return;
      }
      
      // When overlay is closed, use normal handling
      handleKey(key);
    } catch (error) {
      console.error("Error in key handler:", error);
    }
  };
  
  // Intercept ALL keys before any component sees them
  getKeyHandler().on("keypress", globalKeyHandler);
  
  await refreshDir(currentDir)
}

export function destroy(_: CliRenderer) {
  if (globalKeyHandler) {
    getKeyHandler().off("keypress", globalKeyHandler);
    globalKeyHandler = null;
  }
  // detach resize etc. if you add any in the future
}

if (require.main === module) {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
  })
  await run(renderer)
  renderer.start()
}
