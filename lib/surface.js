/**
 * Pure system-prompt surface diff: what the model is TOLD, section by
 * section. A section's identity is its registered name; its content is the
 * sha256 of its resolved text — mcp-test's methodology applied to the prompt.
 */
import { createHash } from 'node:crypto';
export function sha256Text(text) {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}
/** Sections are name-sorted so the snapshot is stable regardless of assembly order. */
export function snapshotFromSections(sections, time) {
    return {
        time,
        sections: [...sections]
            .map((s) => ({ name: s.name, textSha256: sha256Text(s.text) }))
            .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    };
}
export function diffSurfaces(baseline, current, ignore = new Set()) {
    const base = new Map(baseline.sections.filter((s) => !ignore.has(s.name)).map((s) => [s.name, s.textSha256]));
    const cur = new Map(current.sections.filter((s) => !ignore.has(s.name)).map((s) => [s.name, s.textSha256]));
    const changes = [];
    for (const name of [...base.keys()].sort()) {
        if (!cur.has(name))
            changes.push({ kind: 'removed', name });
    }
    for (const name of [...cur.keys()].sort()) {
        if (!base.has(name))
            changes.push({ kind: 'added', name });
        else if (base.get(name) !== cur.get(name))
            changes.push({ kind: 'changed', name });
    }
    return { baselineSections: base.size, currentSections: cur.size, changes };
}
export function summarizeDiff(diff) {
    if (diff.changes.length === 0) {
        return `prompt surface unchanged (${diff.currentSections} section(s))`;
    }
    const parts = diff.changes.map((c) => `${c.kind}:${c.name}`);
    return `prompt surface drift (${diff.baselineSections} -> ${diff.currentSections} section(s)): ${parts.join(', ')}`;
}
