import {
  BoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  type ParsedKey,
  type SelectOption,
} from "@opentui/core";
import { TreeNode, TreeRow, TreeMenuOptions } from "../types";
import { loadFolderContents } from "../utils/fileSystem";

// Tree icons
const TREE_ICONS = {
  folderClosed: "▸",
  folderOpen: "▾", 
  file: "·",
  action: "·"
} as const;

// Utility functions for tree operations
function stringWidth(s: string): number {
  return [...s].length;
}

function padIcon(icon: string, col = 2): string {
  return icon + " ".repeat(Math.max(0, col - stringWidth(icon)));
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>, depth = 0, out: TreeRow[] = []): TreeRow[] {
  for (const n of nodes) {
    out.push({ id: n.path, kind: n.type, depth, label: n.name, meta: n.description });
    if (n.type === "folder" && expanded.has(n.path) && n.children?.length) {
      flattenTree(n.children, expanded, depth + 1, out);
    }
  }
  return out;
}

function renderTreeRow(r: TreeRow, expanded: Set<string>): string {
  const isOpen = r.kind === "folder" && expanded.has(r.id);
  const icon = r.kind === "folder" ? padIcon(isOpen ? TREE_ICONS.folderOpen : TREE_ICONS.folderClosed)
                                   : padIcon(r.kind === "file" ? TREE_ICONS.file : TREE_ICONS.action);
  return `${"  ".repeat(r.depth)}${icon} ${r.label}`;
}

export class TreeMenu extends BoxRenderable {
  private select: SelectRenderable;
  private nodes: TreeNode[];
  private expanded = new Set<string>();
  private rows: TreeRow[] = [];

  // Callbacks
  private onNodeSelected?: (node: TreeNode, index: number) => void;
  private onNodeSelectionChanged?: (node: TreeNode, index: number) => void;
  private onKeyPress?: (key: ParsedKey) => boolean;
  private onGoUp?: () => void;

  constructor(name: string, options: TreeMenuOptions) {
    super(name, {
      flexGrow: 1,
      minHeight: 10,
      backgroundColor: "#001122",
    });

    this.nodes = options.nodes;
    this.onNodeSelected = options.onNodeSelected;
    this.onNodeSelectionChanged = options.onNodeSelectionChanged;
    this.onKeyPress = options.onKeyPress;
    this.onGoUp = options.onGoUp;

    this.refresh();

    this.select = new SelectRenderable("tree-select", {
      flexGrow: 1,
      textColor: "#ffffff",
      selectedBackgroundColor: "#215ea6",
      selectedTextColor: "#ffffff", 
      focusedBackgroundColor: "#163e6f",
      focusedTextColor: "#ffffff",
      wrapSelection: true,
      showDescription: false,
      options: this.makeOptions(),
    });

    this.add(this.select);
    this.setupEventHandlers();
  }

  private refresh() {
    this.rows = flattenTree(this.nodes, this.expanded);
  }

  private makeOptions() {
    return this.rows.map(r => ({ name: renderTreeRow(r, this.expanded), description: r.meta ?? "" }));
  }

  private setupEventHandlers() {
    this.select.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number, _opt: SelectOption) => {
      const row = this.rows[index];
      if (row && this.onNodeSelectionChanged) {
        const node = this.findNodeById(row.id, this.nodes);
        if (node) {
          this.onNodeSelectionChanged(node, index);
        }
      }
    });

    // Remove the old item selected handler since we handle Enter key manually now
    this.select.on(SelectRenderableEvents.ITEM_SELECTED, (index: number, _opt: SelectOption) => {
      // Do nothing - all Enter key behavior is handled in handleEnterKey
      return;
    });

    // Override handleKeyPress for custom key handling
    const originalHandleKeyPress = this.select.handleKeyPress.bind(this.select);
    this.select.handleKeyPress = (key: ParsedKey | string) => {
      if (typeof key === "string") {
        return originalHandleKeyPress(key);
      }

      // Handle tree navigation keys FIRST, before letting SelectRenderable handle them
      if (key.name === "left" || key.name === "right" || key.name === "space" || key.name === "return") {
        if (this.handleTreeNavigation(key)) {
          return true;
        }
      }

      if (this.onKeyPress && this.onKeyPress(key)) {
        return true; // Key was handled by parent
      }
      return originalHandleKeyPress(key);
    };
  }

  private handleTreeNavigation(key: ParsedKey): boolean {
    const selectedIndex = this.select.getSelectedIndex();
    const currentRow = this.rows[selectedIndex];
    if (!currentRow) return false;

    const currentNode = this.findNodeById(currentRow.id, this.nodes);
    if (!currentNode) return false;

    switch (key.name) {
      case "right":
        return this.handleRightArrow(currentNode, selectedIndex);
      case "left":
        return this.handleLeftArrow(currentNode, selectedIndex);
      case "space":
        return this.handleSpaceKey(currentNode, selectedIndex);
      case "return":
        return this.handleEnterKey(currentNode, selectedIndex);
      default:
        return false;
    }
  }

  private handleRightArrow(node: TreeNode, selectedIndex: number): boolean {
    // Right arrow now "steps into" folders (triggers navigation)
    if (node.type === "folder" && this.onNodeSelected) {
      void this.onNodeSelected(node, selectedIndex);
      return true;
    }
    return false;
  }

  private handleLeftArrow(node: TreeNode, selectedIndex: number): boolean {
    const currentRow = this.rows[selectedIndex];
    
    // Left arrow should always "step out" regardless of expansion state
    // If we're at the root level (depth 0), go up to parent directory
    if (currentRow.depth === 0 && this.onGoUp) {
      this.onGoUp();
      return true;
    }
    
    // Otherwise, move to parent folder within current tree
    return this.moveToParent(selectedIndex);
  }

  private handleSpaceKey(node: TreeNode, selectedIndex: number): boolean {
    // Space should toggle expand/collapse based on folder state
    if (node.type === "folder") {
      if (this.expanded.has(node.path)) {
        // Folder is expanded, collapse it
        this.collapseNode(node.path);
      } else {
        // Folder is collapsed, expand it
        void this.expandNode(node.path);
      }
      return true;
    }
    return false;
  }

  private handleEnterKey(node: TreeNode, selectedIndex: number): boolean {
    // Enter now toggles folder expansion/collapse (old Enter behavior for folders)
    if (node.type === "folder") {
      if (this.expanded.has(node.path)) {
        this.collapseNode(node.path);
      } else {
        void this.expandNode(node.path);
      }
      return true;
    } else {
      // For files, still trigger selection (for preview)
      if (this.onNodeSelected) {
        void this.onNodeSelected(node, selectedIndex);
      }
      return true;
    }
  }

  private moveToParent(selectedIndex: number): boolean {
    const currentRow = this.rows[selectedIndex];
    if (!currentRow || currentRow.depth === 0) {
      return false; // Already at root level or no row
    }

    const targetDepth = currentRow.depth - 1;
    
    // Look backwards from current position to find parent
    for (let i = selectedIndex - 1; i >= 0; i--) {
      const row = this.rows[i];
      if (row.depth === targetDepth) {
        this.select.setSelectedIndex(i);
        return true;
      }
      // If we find a row with even less depth, we've gone too far
      if (row.depth < targetDepth) {
        break;
      }
    }
    return false;
  }

  private findNodeById(id: string, nodes: TreeNode[]): TreeNode | undefined {
    for (const n of nodes) {
      if (n.path === id) return n;
      if (n.children) {
        const found = this.findNodeById(id, n.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  // --- Public API ---

  public setNodes(nodes: TreeNode[]) {
    this.nodes = nodes;
    this.expanded.clear();
    this.refresh();
    this.select.options = this.makeOptions();
    this.select.setSelectedIndex(0);
  }

  public getSelectedRow(): TreeRow | undefined {
    const index = this.select.getSelectedIndex();
    return this.rows[index];
  }

  public getSelectedNode(): TreeNode | undefined {
    const row = this.getSelectedRow();
    return row ? this.findNodeById(row.id, this.nodes) : undefined;
  }

  public getSelectedIndex(): number {
    return this.select.getSelectedIndex();
  }

  public setSelectedIndex(index: number) {
    this.select.setSelectedIndex(index);
  }

  public getExpanded(): Set<string> {
    return new Set(this.expanded);
  }

  public async expandNode(nodeId: string) {
    const node = this.findNodeById(nodeId, this.nodes);
    if (node && node.type === "folder" && !node.loaded) {
      await loadFolderContents(node);
    }
    this.expanded.add(nodeId);
    this.refresh();
    this.select.options = this.makeOptions();
  }

  public collapseNode(nodeId: string) {
    this.expanded.delete(nodeId);
    this.refresh();
    this.select.options = this.makeOptions();
  }

  public focus() {
    this.select.focus();
  }

  public blur() {
    this.select.blur();
  }

  public refreshDisplay(keepIndex = true) {
    const oldIndex = keepIndex ? this.select.getSelectedIndex() : 0;
    this.refresh();
    this.select.options = this.makeOptions();
    const newIndex = Math.min(oldIndex, this.rows.length - 1);
    this.select.setSelectedIndex(newIndex);
  }
}