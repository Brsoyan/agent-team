import fs from 'fs';
import path from 'path';

const DEFAULT_ROOT = path.resolve('workspace');

export class Workspace {
  private root: string;

  constructor(root?: string) {
    this.root = root || DEFAULT_ROOT;
  }

  getRoot(): string {
    return this.root;
  }

  private resolveInsideRoot(relativePath: string): string | null {
    const resolvedRoot = path.resolve(this.root);
    const fullPath = path.resolve(resolvedRoot, relativePath);
    const rel = path.relative(resolvedRoot, fullPath);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return fullPath;
  }

  readFile(relativePath: string): string | null {
    const fullPath = this.resolveInsideRoot(relativePath);
    if (!fullPath || !fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf-8');
  }

  writeFile(relativePath: string, content: string): string {
    const fullPath = this.resolveInsideRoot(relativePath);
    if (!fullPath) throw new Error(`Path escapes workspace root: ${relativePath}`);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    return relativePath;
  }

  listFiles(relativeDir: string = ''): string[] {
    const fullPath = path.join(this.root, relativeDir);
    if (!fs.existsSync(fullPath)) return [];
    return this.walkDir(fullPath).map(f => path.relative(this.root, f));
  }

  fileExists(relativePath: string): boolean {
    return fs.existsSync(path.join(this.root, relativePath));
  }

  private walkDir(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.walkDir(full));
      } else {
        results.push(full);
      }
    }
    return results;
  }
}
