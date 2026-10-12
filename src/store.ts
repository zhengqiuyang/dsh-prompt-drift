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

export async function loadSnapshot(path: string): Promise<PromptSurfaceSnapshot | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as PromptSurfaceSnapshot;
  } catch {
    return null;
  }
}
