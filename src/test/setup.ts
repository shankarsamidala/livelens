import { vi } from 'vitest';

// Electron's bundled Node runtime provides a non-standard localStorage that
// lacks .clear(). Replace it with a spec-compliant in-memory implementation
// so that any test can safely call localStorage.clear().
const _store: Record<string, string> = {};

vi.stubGlobal('localStorage', {
    getItem: (key: string) => (_store[key] !== undefined ? _store[key] : null),
    setItem: (key: string, value: string) => {
        _store[key] = String(value);
    },
    removeItem: (key: string) => {
        delete _store[key];
    },
    clear: () => {
        Object.keys(_store).forEach((k) => delete _store[k]);
    },
    key: (index: number) => Object.keys(_store)[index] ?? null,
    get length() {
        return Object.keys(_store).length;
    },
});
