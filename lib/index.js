import Schema from '@deepseek-ai/schemastery';
import '@deepseek-ai/dsh-system-prompt';
import { diffSurfaces, snapshotFromSections, summarizeDiff } from './surface.js';
import { loadSnapshot, saveSnapshot } from './store.js';
export const name = 'dsh-prompt-drift';
export const inject = ['systemPrompt'];
export const Config = Schema.object({
    baselinePath: Schema.string().default('.dsh-prompt-drift/baseline.json').description('committed baseline file'),
    rebaselineOnDrift: Schema.boolean().default(false).description('update the baseline instead of warning (opt-in)'),
    ignoreSections: Schema.array(Schema.string()).default([]).description('section names excluded from the surface'),
});
export function apply(ctx, config) {
    const ignore = new Set(config.ignoreSections);
    let lastSignature = '';
    let baselineSeen = false;
    async function check(assembly) {
        const names = assembly.sections.map((s) => s.name);
        if (new Set(names).size !== names.length) {
            console.warn(`[dsh-prompt-drift] duplicate section names in assembly (${names.join(', ')}) — baseline not updated`);
            return;
        }
        const current = snapshotFromSections(assembly.sections, new Date().toISOString());
        const loaded = await loadSnapshot(config.baselinePath);
        if (loaded.status === 'absent') {
            await saveSnapshot(config.baselinePath, current);
            console.log(`[dsh-prompt-drift] baseline established: ${current.sections.length} section(s) -> ${config.baselinePath} (commit it)`);
            baselineSeen = true;
            return;
        }
        if (loaded.status !== 'ok') {
            // T10: a damaged/unreadable baseline is never silently re-baselined.
            console.warn(`[dsh-prompt-drift] baseline at ${config.baselinePath} is ${loaded.status} (${loaded.error}). ` +
                `Refusing to overwrite — delete it deliberately to re-baseline.`);
            baselineSeen = true;
            return;
        }
        baselineSeen = true;
        const diff = diffSurfaces(loaded.value, current, ignore);
        if (diff.changes.length === 0)
            return;
        const signature = JSON.stringify(diff.changes);
        if (signature === lastSignature)
            return;
        lastSignature = signature;
        if (config.rebaselineOnDrift) {
            await saveSnapshot(config.baselinePath, current);
            console.warn(`[dsh-prompt-drift] rebaselined: ${summarizeDiff(diff)}`);
            return;
        }
        console.warn(`[dsh-prompt-drift] DRIFT — ${summarizeDiff(diff)}\n` +
            `  A plugin or preset changed what the model is told. If intended, set ` +
            `rebaselineOnDrift: true once (or delete the baseline) to accept it.`);
    }
    ctx.on('system-prompt/assemble', async (assembly, _context, next) => {
        const result = await next();
        if (!baselineSeen || lastSignature === '') {
            // First assemblies flow through; the debounce-free path is fine here
            // because identical drift states log once (signature dedup above).
        }
        void check(result);
        return result;
    });
    console.log(`[dsh-prompt-drift] active: watching system-prompt/assemble, baseline=${config.baselinePath}`);
}
