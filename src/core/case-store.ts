import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReviewCase } from './types.js';

export class CaseStore {
  private readonly busy = new Set<string>();
  constructor(private readonly directory: string) {}
  private path(id: string): string {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid case id');
    return join(this.directory, `${id}.json`);
  }
  async create(input: Omit<ReviewCase, 'id' | 'status' | 'createdAt' | 'expiresAt'>): Promise<ReviewCase> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const createdAt = new Date();
    const item: ReviewCase = { ...input, id: randomUUID(), status: 'pending', createdAt: createdAt.toISOString(), expiresAt: new Date(createdAt.getTime() + 24 * 3600_000).toISOString() };
    const handle = await open(this.path(item.id), 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(item)); } finally { await handle.close(); }
    return item;
  }
  async get(id: string): Promise<ReviewCase | undefined> {
    try { return JSON.parse(await readFile(this.path(id), 'utf8')) as ReviewCase; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }
  async withPending<T>(id: string, operation: (item: ReviewCase, save: (updated: ReviewCase) => Promise<void>) => Promise<T>): Promise<T> {
    if (this.busy.has(id)) throw new Error('Case is already being reviewed');
    this.busy.add(id);
    try {
      const item = await this.get(id);
      if (!item || item.status !== 'pending' || Date.parse(item.expiresAt) <= Date.now()) throw new Error('Case is unavailable or already resolved');
      return await operation(item, async updated => {
        const tmp = join(this.directory, `${id}.${randomUUID()}.tmp`);
        await writeFile(tmp, JSON.stringify(updated), { mode: 0o600 });
        await rename(tmp, this.path(id));
      });
    } finally { this.busy.delete(id); }
  }
  async purgeExpired(): Promise<number> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    let count = 0;
    for (const file of await readdir(this.directory)) {
      if (!/^[0-9a-f-]{36}\.json$/.test(file)) continue;
      const item = await this.get(file.slice(0, -5));
      if (item && Date.parse(item.expiresAt) <= Date.now()) { await rm(join(this.directory, file)); count++; }
    }
    return count;
  }
}
