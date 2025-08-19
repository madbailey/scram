import { promises as fs } from "fs";
import * as path from "path";
import { FileItem, TreeNode, FileInfo } from "../types";
import { humanSize } from "./formatting";

// File system operation utilities

export async function listDir(dir: string): Promise<FileItem[]> {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  const rows: FileItem[] = [];
  
  // Add parent directory entry (..), unless at root of drive
  const parent = path.dirname(dir);
  if (parent && parent !== dir) {
    rows.push({
      kind: "folder",
      name: "..",
      abs: parent,
      rel: path.relative(dir, parent) || "..",
    });
  }
  
  for (const d of ents) {
    const abs = path.join(dir, d.name);
    try {
      const stat = await fs.stat(abs);
      rows.push({
        kind: d.isDirectory() ? "folder" : "file",
        name: d.name,
        abs,
        rel: path.relative(dir, abs) || d.name,
        size: d.isDirectory() ? undefined : stat.size,
      });
    } catch {
      // skip unreadables
    }
  }
  
  // Folders first, then files, alpha within groups
  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  
  return rows;
}

export async function readDirectory(dirPath: string): Promise<TreeNode[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: TreeNode[] = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stat = await fs.stat(fullPath);
        const isDirectory = entry.isDirectory();
        
        nodes.push({
          name: entry.name,
          description: isDirectory ? "folder" : humanSize(stat.size),
          type: isDirectory ? "folder" : "file",
          path: fullPath,
          children: isDirectory ? [] : undefined,
          loaded: isDirectory ? false : undefined,
          size: isDirectory ? undefined : stat.size,
        });
      } catch {
        // Skip files that can't be accessed
      }
    }
    
    // Sort: folders first, then files, alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    
    return nodes;
  } catch {
    return [];
  }
}

export async function loadFolderContents(node: TreeNode): Promise<void> {
  if (node.type === "folder" && !node.loaded) {
    node.children = await readDirectory(node.path);
    node.loaded = true;
  }
}

export function createFileSystemRoot(rootPath: string = process.cwd()): TreeNode {
  return {
    name: path.basename(rootPath) || rootPath,
    description: "folder",
    type: "folder",
    path: rootPath,
    children: [],
    loaded: false,
  };
}

export async function buildTreeFromDir(dir: string): Promise<TreeNode> {
  const items = await listDir(dir);
  const children = items.map(fileItemToTreeNode);
  
  return {
    name: path.basename(dir) || dir,
    description: "folder",
    type: "folder",
    path: dir,
    children,
    loaded: true,
    size: undefined,
  };
}

export function isBinaryBuffer(buffer: Buffer): boolean {
  const sampleSize = Math.min(buffer.length, 1024);
  let nullCount = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] === 0) {
      nullCount++;
    }
  }
  
  // If more than 1% of the sample is null bytes, consider it binary
  return (nullCount / sampleSize) > 0.01;
}

// Conversion utilities
export function fileItemToTreeNode(item: FileItem): TreeNode {
  return {
    name: item.name,
    description: item.kind === "folder" ? "folder" : humanSize(item.size),
    type: item.kind,
    path: item.abs,
    children: item.kind === "folder" ? [] : undefined,
    loaded: item.kind === "folder" ? false : undefined,
    size: item.size,
  };
}

export function treeNodeToFileItem(node: TreeNode, currentDir: string = process.cwd()): FileItem {
  return {
    kind: (node.type === "action" ? "file" : node.type) as FileItem["kind"],
    name: node.name,
    abs: node.path,
    rel: path.relative(currentDir, node.path) || node.name,
    size: node.size,
  };
}

export function treeNodeToFileInfo(node: TreeNode): FileInfo {
  return {
    name: node.name,
    path: node.path,
    size: node.size,
    type: node.type === "folder" ? "folder" : "file",
  };
}

export function fileItemToFileInfo(item: FileItem): FileInfo {
  return {
    name: item.name,
    path: item.abs,
    size: item.size,
    type: item.kind,
  };
}