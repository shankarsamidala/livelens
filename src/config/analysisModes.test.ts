import { describe, it, expect } from 'vitest';
import { ANALYSIS_MODES } from './analysisModes';

describe('ANALYSIS_MODES', () => {
    it('has at least one mode', () => {
        expect(ANALYSIS_MODES.length).toBeGreaterThan(0);
    });

    it('every mode has required string fields', () => {
        for (const mode of ANALYSIS_MODES) {
            expect(typeof mode.id).toBe('string');
            expect(typeof mode.icon).toBe('string');
            expect(typeof mode.label).toBe('string');
            expect(typeof mode.description).toBe('string');
            expect(typeof mode.color).toBe('string');
            expect(typeof mode.border).toBe('string');
        }
    });

    it('all ids are unique', () => {
        const ids = ANALYSIS_MODES.map((m) => m.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('all labels are unique', () => {
        const labels = ANALYSIS_MODES.map((m) => m.label);
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('includes general mode', () => {
        expect(ANALYSIS_MODES.some((m) => m.id === 'general')).toBe(true);
    });
});
