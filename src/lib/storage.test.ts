import { describe, it, expect, beforeEach } from 'vitest';
import { storage, STORAGE_KEYS } from './storage';

beforeEach(() => localStorage.clear());

describe('storage.get / storage.set', () => {
    it('returns null for missing key', () => {
        expect(storage.get(STORAGE_KEYS.overlayOpacity)).toBeNull();
    });

    it('round-trips a string value', () => {
        storage.set(STORAGE_KEYS.overlayOpacity, '0.75');
        expect(storage.get(STORAGE_KEYS.overlayOpacity)).toBe('0.75');
    });
});

describe('storage.getBool', () => {
    it('returns false for missing key', () => {
        expect(storage.getBool(STORAGE_KEYS.overlayOpacity)).toBe(false);
    });

    it('returns true for "true"', () => {
        storage.set(STORAGE_KEYS.overlayOpacity, 'true');
        expect(storage.getBool(STORAGE_KEYS.overlayOpacity)).toBe(true);
    });

    it('returns false for "false"', () => {
        storage.set(STORAGE_KEYS.overlayOpacity, 'false');
        expect(storage.getBool(STORAGE_KEYS.overlayOpacity)).toBe(false);
    });
});

describe('storage.getNumber', () => {
    it('returns fallback for missing key', () => {
        expect(storage.getNumber(STORAGE_KEYS.overlayOpacity, 42)).toBe(42);
    });

    it('parses a numeric string', () => {
        storage.set(STORAGE_KEYS.overlayOpacity, '3.14');
        expect(storage.getNumber(STORAGE_KEYS.overlayOpacity, 0)).toBeCloseTo(3.14);
    });

    it('returns fallback for non-numeric value', () => {
        storage.set(STORAGE_KEYS.overlayOpacity, 'nan');
        expect(storage.getNumber(STORAGE_KEYS.overlayOpacity, 7)).toBe(7);
    });
});

describe('storage.remove', () => {
    it('removes the key', () => {
        storage.set(STORAGE_KEYS.overlayOpacity, '1');
        storage.remove(STORAGE_KEYS.overlayOpacity);
        expect(storage.get(STORAGE_KEYS.overlayOpacity)).toBeNull();
    });
});
