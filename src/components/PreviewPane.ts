import {
  BoxRenderable,
  TextRenderable,
  GroupRenderable,
} from "@opentui/core";
import { promises as fs } from "fs";
import * as path from "path";
import { FileInfo, PreviewPaneOptions } from "../types";
import { formatBytes, isBinaryBuffer } from "../utils";

export class PreviewPane extends BoxRenderable {
  private titleBar: TextRenderable;
  private contentArea: GroupRenderable;
  private contentText: TextRenderable;
  
  private maxPreviewSize: number;
  private maxLines: number;

  constructor(name: string, options: PreviewPaneOptions = {}) {
    super(name, {
      width: "auto",
      height: "auto",
      minWidth: 32,
      flexGrow: 2,
      flexShrink: 1,
      title: "Preview",
      titleAlignment: "center",
      borderStyle: "single",
      borderColor: "#475569",
      backgroundColor: options.backgroundColor || "transparent",
    });

    this.maxPreviewSize = options.maxPreviewSize || 512 * 1024; // 512KB default
    this.maxLines = options.maxLines || 500; // 500 lines default

    // Create internal structure
    this.contentArea = new GroupRenderable("preview-content", {
      width: "auto",
      height: "auto",
      flexDirection: "column",
      flexGrow: 1,
    });
    this.add(this.contentArea);

    this.titleBar = new TextRenderable("preview-title", {
      content: options.title || "Preview",
      fg: "#e5e7eb",
      bg: "transparent",
      height: 1,
    });
    this.contentArea.add(this.titleBar);

    this.contentText = new TextRenderable("preview-text", {
      content: "Select a file to preview its contents.",
      fg: "#cbd5e1",
      bg: "transparent",
      flexGrow: 1,
      flexShrink: 1,
    });
    this.contentArea.add(this.contentText);
  }

  // Main preview method - determines file type and renders accordingly
  public async previewFile(fileInfo: FileInfo): Promise<void> {
    if (fileInfo.type === "folder") {
      this.showFolderInfo(fileInfo);
      return;
    }

    this.titleBar.content = fileInfo.name;
    
    // Check file size limits
    const size = fileInfo.size ?? 0;
    if (size > this.maxPreviewSize) {
      this.showLargeFileMessage(fileInfo);
      return;
    }

    // Determine file type by extension
    const ext = path.extname(fileInfo.path).toLowerCase();
    
    try {
      switch (ext) {
        case '.json':
          await this.previewJson(fileInfo);
          break;
        case '.md':
        case '.markdown':
          await this.previewMarkdown(fileInfo);
          break;
        case '.js':
        case '.ts':
        case '.jsx':
        case '.tsx':
          await this.previewCode(fileInfo, this.getLanguageFromExtension(ext));
          break;
        case '.py':
        case '.rb':
        case '.go':
        case '.rs':
        case '.c':
        case '.cpp':
        case '.h':
        case '.hpp':
          await this.previewCode(fileInfo, this.getLanguageFromExtension(ext));
          break;
        case '.html':
        case '.htm':
          await this.previewHtml(fileInfo);
          break;
        case '.css':
        case '.scss':
        case '.sass':
          await this.previewCode(fileInfo, 'css');
          break;
        case '.xml':
        case '.svg':
          await this.previewXml(fileInfo);
          break;
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.bmp':
        case '.webp':
          await this.previewImage(fileInfo);
          break;
        case '.pdf':
          await this.previewPdf(fileInfo);
          break;
        case '.zip':
        case '.tar':
        case '.gz':
        case '.7z':
        case '.rar':
          await this.previewArchive(fileInfo);
          break;
        case '.exe':
        case '.dll':
        case '.so':
        case '.dylib':
          await this.previewBinary(fileInfo);
          break;
        default:
          await this.previewText(fileInfo);
      }
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  public showMessage(title: string, message: string): void {
    this.titleBar.content = title;
    this.contentText.content = message;
  }

  public showHelp(): void {
    this.titleBar.content = "Help";
    this.contentText.content = `File Navigator Help

Navigation:
→ step into folders    ← step out/back
Space/Enter toggle     

Search & Commands:
Ctrl+F    - Open search overlay
/         - Open command overlay
Esc       - Close overlay/quit

Commands (in overlay):
/help     - Show this help
/up       - Go up one directory
/home     - Go to home directory  
/root     - Go to root directory
/search   - Search for files (coming soon)
/find     - Find files by name (coming soon)

Preview Support:
• Text files (with syntax detection)
• JSON (formatted)
• Markdown
• Code files (JS, TS, Python, Go, Rust, C/C++, etc.)
• HTML/XML
• Images (metadata)
• Archives (contents list)
• Binary files (metadata)

File size limit: ${formatBytes(this.maxPreviewSize)}
Line limit: ${this.maxLines} lines`;
  }

  private async previewText(fileInfo: FileInfo): Promise<void> {
    try {
      const buffer = await fs.readFile(fileInfo.path);
      
      // Check for binary content
      if (isBinaryBuffer(buffer)) {
        await this.previewBinary(fileInfo);
        return;
      }
      
      const text = buffer.toString('utf8');
      const lines = text.split('\n');
      
      if (lines.length > this.maxLines) {
        const truncated = lines.slice(0, this.maxLines).join('\n');
        this.contentText.content = `${truncated}\n\n[... truncated at ${this.maxLines} lines, total: ${lines.length} lines]`;
      } else {
        this.contentText.content = text;
      }
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private async previewJson(fileInfo: FileInfo): Promise<void> {
    try {
      const text = await fs.readFile(fileInfo.path, 'utf8');
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      
      const lines = formatted.split('\n');
      if (lines.length > this.maxLines) {
        const truncated = lines.slice(0, this.maxLines).join('\n');
        this.contentText.content = `${truncated}\n\n[... truncated JSON, ${lines.length} total lines]`;
      } else {
        this.contentText.content = formatted;
      }
    } catch (error) {
      // Fall back to text preview if JSON parsing fails
      await this.previewText(fileInfo);
    }
  }

  private async previewMarkdown(fileInfo: FileInfo): Promise<void> {
    // For now, just show as text. Could add markdown rendering later
    await this.previewText(fileInfo);
  }

  private async previewCode(fileInfo: FileInfo, language: string): Promise<void> {
    try {
      const text = await fs.readFile(fileInfo.path, 'utf8');
      const lines = text.split('\n');
      
      // Add language indicator
      let content = `Language: ${language}\n${'='.repeat(20)}\n\n`;
      
      if (lines.length > this.maxLines) {
        const truncated = lines.slice(0, this.maxLines).join('\n');
        content += `${truncated}\n\n[... truncated at ${this.maxLines} lines, total: ${lines.length} lines]`;
      } else {
        content += text;
      }
      
      this.contentText.content = content;
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private async previewHtml(fileInfo: FileInfo): Promise<void> {
    try {
      const text = await fs.readFile(fileInfo.path, 'utf8');
      
      // Extract title if present
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : 'No title';
      
      let content = `HTML Document\nTitle: ${title}\n${'='.repeat(30)}\n\n`;
      
      const lines = text.split('\n');
      if (lines.length > this.maxLines) {
        const truncated = lines.slice(0, this.maxLines).join('\n');
        content += `${truncated}\n\n[... truncated HTML, ${lines.length} total lines]`;
      } else {
        content += text;
      }
      
      this.contentText.content = content;
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private async previewXml(fileInfo: FileInfo): Promise<void> {
    try {
      const text = await fs.readFile(fileInfo.path, 'utf8');
      
      let content = `XML Document\n${'='.repeat(20)}\n\n`;
      
      const lines = text.split('\n');
      if (lines.length > this.maxLines) {
        const truncated = lines.slice(0, this.maxLines).join('\n');
        content += `${truncated}\n\n[... truncated XML, ${lines.length} total lines]`;
      } else {
        content += text;
      }
      
      this.contentText.content = content;
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private async previewImage(fileInfo: FileInfo): Promise<void> {
    try {
      const stats = await fs.stat(fileInfo.path);
      const ext = path.extname(fileInfo.path).toLowerCase();
      
      this.contentText.content = `Image File\n${'='.repeat(15)}\n\n` +
        `Format: ${ext.substring(1).toUpperCase()}\n` +
        `Size: ${formatBytes(stats.size)}\n` +
        `Modified: ${stats.mtime.toLocaleString()}\n\n` +
        `[Image preview not available in terminal]\n` +
        `Path: ${fileInfo.path}`;
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private async previewPdf(fileInfo: FileInfo): Promise<void> {
    try {
      const stats = await fs.stat(fileInfo.path);
      
      this.contentText.content = `PDF Document\n${'='.repeat(15)}\n\n` +
        `Size: ${formatBytes(stats.size)}\n` +
        `Modified: ${stats.mtime.toLocaleString()}\n\n` +
        `[PDF preview not available in terminal]\n` +
        `Path: ${fileInfo.path}`;
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private async previewArchive(fileInfo: FileInfo): Promise<void> {
    try {
      const stats = await fs.stat(fileInfo.path);
      const ext = path.extname(fileInfo.path).toLowerCase();
      
      this.contentText.content = `Archive File\n${'='.repeat(15)}\n\n` +
        `Format: ${ext.substring(1).toUpperCase()}\n` +
        `Size: ${formatBytes(stats.size)}\n` +
        `Modified: ${stats.mtime.toLocaleString()}\n\n` +
        `[Archive contents listing not implemented]\n` +
        `Path: ${fileInfo.path}`;
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private async previewBinary(fileInfo: FileInfo): Promise<void> {
    try {
      const stats = await fs.stat(fileInfo.path);
      const ext = path.extname(fileInfo.path);
      
      this.contentText.content = `Binary File\n${'='.repeat(15)}\n\n` +
        `Extension: ${ext || 'none'}\n` +
        `Size: ${formatBytes(stats.size)}\n` +
        `Modified: ${stats.mtime.toLocaleString()}\n\n` +
        `[Binary content - no preview available]\n` +
        `Path: ${fileInfo.path}`;
    } catch (error) {
      this.showError(fileInfo, error);
    }
  }

  private showFolderInfo(fileInfo: FileInfo): void {
    this.titleBar.content = fileInfo.name;
    this.contentText.content = `Folder\n${fileInfo.path}\n\nUse → arrow key or Enter to navigate into this folder.`;
  }

  private showLargeFileMessage(fileInfo: FileInfo): void {
    this.contentText.content = `Large File\n${'='.repeat(15)}\n\n` +
      `File size: ${formatBytes(fileInfo.size || 0)}\n` +
      `Limit: ${formatBytes(this.maxPreviewSize)}\n\n` +
      `File is too large to preview.\n` +
      `Path: ${fileInfo.path}`;
  }

  private showError(fileInfo: FileInfo, error: any): void {
    this.contentText.content = `Error previewing file:\n${fileInfo.path}\n\n` +
      `${error.message || 'Unknown error occurred'}`;
  }

  private getLanguageFromExtension(ext: string): string {
    const langMap: { [key: string]: string } = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript (JSX)',
      '.ts': 'TypeScript', 
      '.tsx': 'TypeScript (TSX)',
      '.py': 'Python',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.c': 'C',
      '.cpp': 'C++',
      '.h': 'C Header',
      '.hpp': 'C++ Header',
      '.java': 'Java',
      '.cs': 'C#',
      '.php': 'PHP',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
    };
    
    return langMap[ext] || ext.substring(1).toUpperCase();
  }
}