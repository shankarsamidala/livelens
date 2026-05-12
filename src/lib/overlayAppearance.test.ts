import { describe, it, expect, beforeEach } from 'vitest';
import {
    clampOverlayOpacity,
    getDefaultOverlayOpacity,
    readStoredOpacity,
    getOverlayAppearance,
    OVERLAY_OPACITY_MIN,
    OVERLAY_OPACITY_MAX,
    OVERLAY_OPACITY_DEFAULT_DARK,
    OVERLAY_OPACITY_DEFAULT_LIGHT,
} from './overlayAppearance';

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
});

describe('clampOverlayOpacity', () => {
    it('clamps below min to min', () => {
        expect(clampOverlayOpacity(0)).toBe(OVERLAY_OPACITY_MIN);
    });

    it('clamps above max to max', () => {
        expect(clampOverlayOpacity(2)).toBe(OVERLAY_OPACITY_MAX);
    });

    it('passes through in-range value', () => {
        expect(clampOverlayOpacity(0.7)).toBeCloseTo(0.7);
    });
});

describe('getDefaultOverlayOpacity', () => {
    it('returns dark default when no data-theme attribute', () => {
        expect(getDefaultOverlayOpacity()).toBe(OVERLAY_OPACITY_DEFAULT_DARK);
    });

    it('returns light default for data-theme="light"', () => {
        document.documentElement.setAttribute('data-theme', 'light');
        expect(getDefaultOverlayOpacity()).toBe(OVERLAY_OPACITY_DEFAULT_LIGHT);
    });

    it('returns dark default for data-theme="dark"', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        expect(getDefaultOverlayOpacity()).toBe(OVERLAY_OPACITY_DEFAULT_DARK);
    });
});

describe('readStoredOpacity', () => {
    it('returns theme default when localStorage is empty', () => {
        expect(readStoredOpacity()).toBe(getDefaultOverlayOpacity());
    });

    it('returns parsed value when valid opacity is stored', () => {
        localStorage.setItem('natively_overlay_opacity', '0.6');
        expect(readStoredOpacity()).toBeCloseTo(0.6);
    });

    it('clamps stored value to min', () => {
        localStorage.setItem('natively_overlay_opacity', '0.1');
        expect(readStoredOpacity()).toBe(OVERLAY_OPACITY_MIN);
    });

    it('clamps stored value to max', () => {
        localStorage.setItem('natively_overlay_opacity', '1.5');
        expect(readStoredOpacity()).toBe(OVERLAY_OPACITY_MAX);
    });

    it('falls back to default for non-numeric stored value', () => {
        localStorage.setItem('natively_overlay_opacity', 'invalid');
        expect(readStoredOpacity()).toBe(getDefaultOverlayOpacity());
    });
});

describe('getOverlayAppearance', () => {
    it('returns an object with all required style keys for dark theme', () => {
        const appearance = getOverlayAppearance(0.8, 'dark');
        const keys = ['shellStyle', 'pillStyle', 'transcriptStyle', 'subtleStyle', 'chipStyle',
            'inputStyle', 'controlStyle', 'iconStyle', 'codeBlockStyle', 'codeHeaderStyle', 'dividerStyle'];
        for (const key of keys) {
            expect(appearance).toHaveProperty(key);
        }
    });

    it('returns an object with all required style keys for light theme', () => {
        const appearance = getOverlayAppearance(0.7, 'light');
        expect(appearance).toHaveProperty('shellStyle');
        expect(appearance).toHaveProperty('pillStyle');
    });

    it('shellStyle.backdropFilter scales with opacity', () => {
        const low = getOverlayAppearance(OVERLAY_OPACITY_MIN, 'dark');
        const high = getOverlayAppearance(OVERLAY_OPACITY_MAX, 'dark');
        const blurLow = parseFloat((low.shellStyle.backdropFilter as string).match(/blur\(([^p]+)/)![1]);
        const blurHigh = parseFloat((high.shellStyle.backdropFilter as string).match(/blur\(([^p]+)/)![1]);
        expect(blurHigh).toBeGreaterThan(blurLow);
    });
});
