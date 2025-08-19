import { ParsedKey } from "@opentui/core";

// File system types
export type FileType = "file" | "folder";
export type TreeNodeKind = "file" | "folder" | "action";

export interface FileItem {
  kind: FileType;
  name: string;
  abs: string;
  rel: string;
  size?: number;
}

export interface TreeNode {
  name: string;
  description?: string;
  type: TreeNodeKind;
  path: string;
  children?: TreeNode[];
  loaded?: boolean; // Track if folder contents have been loaded
  size?: number; // For files
}

export interface TreeRow {
  id: string;
  kind: TreeNodeKind;
  depth: number;
  label: string;
  meta?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size?: number;
  type: FileType;
}