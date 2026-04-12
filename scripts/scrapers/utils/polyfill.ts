// Polyfill for Node 18 compatibility with newer packages that expect web globals
if (typeof (global as any).File === 'undefined') {
  (global as any).File = class extends Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], name: string, options?: any) {
      super(parts, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}
