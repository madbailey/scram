import { ParsedKey } from "@opentui/core";
import { TreeNode } from "./FileSystem";

// Navigation and menu types
export interface MenuItem {
  id: string;
  label: string;
  description?: string;
  [key: string]: any; // Allow other properties
}

export interface MenuOptions {
  items: MenuItem[];
  onItemSelected?: (item: MenuItem, index: number) => void;
  onItemSelectionChanged?: (item: MenuItem, index: number) => void;
  onKeyPress?: (key: ParsedKey) => boolean; // Return true if the key was handled
}

export interface TreeMenuOptions {
  nodes: TreeNode[];
  onNodeSelected?: (node: TreeNode, index: number) => void;
  onNodeSelectionChanged?: (node: TreeNode, index: number) => void;
  onKeyPress?: (key: ParsedKey) => boolean;
  onGoUp?: () => void; // New callback for going up one directory level
}

export interface OverlayInputBarOptions {
  placeholder?: string;
  onPathSubmit?: (path: string) => void;
  onCommand?: (command: string, args: string[]) => void;
  onInput?: (value: string) => void;
  onCancel?: () => void;
  width?: number | string;
  height?: number;
}

export interface PreviewPaneOptions {
  title?: string;
  backgroundColor?: string;
  maxPreviewSize?: number; // Maximum file size to preview in bytes
  maxLines?: number; // Maximum lines to display
}