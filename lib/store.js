/**
 * Baseline store for the prompt surface: stable, name-sorted JSON on disk,
 * meant to be committed — the baseline IS the contract.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
export async function saveSnapshot(path, snapshot) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}
export async function loadSnapshot(path) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    }
    catch {
        return null;
    }
}
