// Utility functions for formatting data

export function humanSize(n: number | undefined): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  const k = n / 1024;
  if (k < 1024) return `${k.toFixed(1)} KB`;
  const m = k / 1024;
  return `${m.toFixed(1)} MB`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function stringWidth(s: string): number {
  return [...s].length;
}

export function padIcon(icon: string, col = 2): string {
  return icon + " ".repeat(Math.max(0, col - stringWidth(icon)));
}