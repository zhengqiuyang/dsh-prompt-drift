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
/** T10: absent / unreadable / malformed / ok are distinct — damage is never
 *  silently treated as first-use. */
export async function loadSnapshot(path) {
    let text;
    try {
        text = await readFile(path, 'utf8');
    }
    catch (e) {
        const code = e.code ?? '';
        if (code === 'ENOENT')
            return { status: 'absent' };
        return { status: 'unreadable', error: code || e.message.slice(0, 60) };
    }
    try {
        const parsed = JSON.parse(text);
        const names = (parsed.sections ?? []).map((s) => s.name);
        if (new Set(names).size !== names.length) {
            return { status: 'malformed', error: 'duplicate section names' };
        }
        if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.sections)) {
            return { status: 'malformed', error: 'missing sections array' };
        }
        return { status: 'ok', value: parsed };
    }
    catch (e) {
        return { status: 'malformed', error: e.message.slice(0, 60) };
    }
}
