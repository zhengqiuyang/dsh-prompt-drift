/**
 * Baseline store for the prompt surface: stable, name-sorted JSON on disk,
 * meant to be committed — the baseline IS the contract.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { PromptSurfaceSnapshot } from './surface.js';

export async function saveSnapshot(path: string, snapshot: PromptSurfaceSnapshot): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

export type SnapshotLoad =
  | { status: 'absent' }
  | { status: 'unreadable'; error: string }
  | { status: 'malformed'; error: string }
  | { status: 'ok'; value: PromptSurfaceSnapshot };

/** T10: absent / unreadable / malformed / ok are distinct — damage is never
 *  silently treated as first-use. */
export async function loadSnapshot(path: string): Promise<SnapshotLoad> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? '';
    if (code === 'ENOENT') return { status: 'absent' };
    return { status: 'unreadable', error: code || (e as Error).message.slice(0, 60) };
  }
  try {
    const parsed = JSON.parse(text) as PromptSurfaceSnapshot;
    if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.sections)) {
      return { status: 'malformed', error: 'missing sections array' };
    }
    return { status: 'ok', value: parsed };
  } catch (e) {
    return { status: 'malformed', error: (e as Error).message.slice(0, 60) };
  }
}
