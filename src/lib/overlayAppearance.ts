import type React from 'react';
import { OVERLAY_DARK, OVERLAY_LIGHT } from '../styles/tokens';

export type OverlayTheme = 'light' | 'dark';

export interface OverlayAppearance {
    shellStyle: React.CSSProperties;
    pillStyle: React.CSSProperties;
    transcriptStyle: React.CSSProperties;
    subtleStyle: React.CSSProperties;
    chipStyle: React.CSSProperties;
    inputStyle: React.CSSProperties;
    controlStyle: React.CSSProperties;
    iconStyle: React.CSSProperties;
    codeBlockStyle: React.CSSProperties;
    codeHeaderStyle: React.CSSProperties;
    dividerStyle: React.CSSProperties;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (min: number, max: number, value: number) => min + (max - min) * value;

export const OVERLAY_OPACITY_MIN = 0.35;
export const OVERLAY_OPACITY_MAX = 1;
/** @deprecated Use getDefaultOverlayOpacity() for theme-aware default. */
export const OVERLAY_OPACITY_DEFAULT = 0.65;
export const OVERLAY_OPACITY_DEFAULT_DARK = 0.8;
export const OVERLAY_OPACITY_DEFAULT_LIGHT = 0.7;

/** Returns the correct default opacity based on the currently active theme. */
export const getDefaultOverlayOpacity = (): number =>
    document.documentElement.getAttribute('data-theme') === 'light'
        ? OVERLAY_OPACITY_DEFAULT_LIGHT
        : OVERLAY_OPACITY_DEFAULT_DARK;

export const clampOverlayOpacity = (opacity: number) => clamp(opacity, OVERLAY_OPACITY_MIN, OVERLAY_OPACITY_MAX);

/**
 * Reads the stored overlay opacity from localStorage, falling back to the
 * theme-aware default. Centralises the 4-line parse+clamp pattern that was
 * duplicated in App.tsx and SettingsOverlay.tsx.
 */
export const readStoredOpacity = (): number => {
    const stored = localStorage.getItem('natively_overlay_opacity');
    const parsed = stored ? parseFloat(stored) : NaN;
    return Number.isFinite(parsed) ? clampOverlayOpacity(parsed) : getDefaultOverlayOpacity();
};

const normalizeOpacity = (opacity: number) =>
    (clampOverlayOpacity(opacity) - OVERLAY_OPACITY_MIN) / (OVERLAY_OPACITY_MAX - OVERLAY_OPACITY_MIN);
const scale = (min: number, max: number, strength: number, ease = 1) =>
    mix(min, max, Math.pow(clamp(strength, 0, 1), ease));

export const getOverlayAppearance = (opacity: number, theme: OverlayTheme): OverlayAppearance => {
    const strength = normalizeOpacity(opacity);
    const surfaceStrength = Math.pow(strength, 1.02);
    const blurStrength = Math.pow(strength, 0.94);

    const lp = OVERLAY_LIGHT.panelBase;   // '214, 228, 247'
    const lb = OVERLAY_LIGHT.borderBase;  // '37, 99, 235'

    if (theme === 'light') {
        return {
            shellStyle: {
                backgroundColor: `rgba(${lp}, ${scale(0.085, 1, surfaceStrength)})`,
                borderColor: `rgba(${lb}, ${scale(0.08, 0.16, surfaceStrength)})`,
                boxShadow: 'none',
                backdropFilter: `blur(${scale(4, 18, blurStrength)}px) saturate(145%)`,
                WebkitBackdropFilter: `blur(${scale(4, 18, blurStrength)}px) saturate(145%)`,
            },
            pillStyle: {
                backgroundColor: `rgba(221, 234, 250, ${scale(0.075, 0.98, surfaceStrength)})`,
                borderColor: `rgba(${lb}, ${scale(0.08, 0.16, surfaceStrength)})`,
                boxShadow: 'none',
                backdropFilter: `blur(${scale(3, 11, blurStrength)}px) saturate(140%)`,
                WebkitBackdropFilter: `blur(${scale(3, 11, blurStrength)}px) saturate(140%)`,
            },
            transcriptStyle: {
                backgroundColor: 'transparent',
                borderBottomColor: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
            },
            subtleStyle: {
                backgroundColor: `rgba(245, 249, 255, ${scale(0.05, 0.92, surfaceStrength)})`,
                borderColor: `rgba(30, 64, 175, ${scale(0.06, 0.13, surfaceStrength)})`,
            },
            chipStyle: {
                backgroundColor: `rgba(248, 251, 255, ${scale(0.055, 0.9, surfaceStrength)})`,
                borderColor: `rgba(30, 64, 175, ${scale(0.06, 0.13, surfaceStrength)})`,
            },
            inputStyle: {
                backgroundColor: `rgba(248, 251, 255, ${scale(0.065, 0.94, surfaceStrength)})`,
                borderColor: `rgba(30, 64, 175, ${scale(0.07, 0.14, surfaceStrength)})`,
            },
            controlStyle: {
                backgroundColor: `rgba(248, 251, 255, ${scale(0.06, 0.92, surfaceStrength)})`,
                borderColor: `rgba(30, 64, 175, ${scale(0.07, 0.14, surfaceStrength)})`,
            },
            iconStyle: {
                backgroundColor: `rgba(248, 251, 255, ${scale(0.055, 0.88, surfaceStrength)})`,
            },
            codeBlockStyle: {
                backgroundColor: `rgba(245, 249, 255, ${scale(0.06, 0.94, surfaceStrength)})`,
                borderColor: `rgba(30, 64, 175, ${scale(0.07, 0.15, surfaceStrength)})`,
            },
            codeHeaderStyle: {
                backgroundColor: `rgba(236, 244, 255, ${scale(0.08, 0.96, surfaceStrength)})`,
                borderBottomColor: `rgba(30, 64, 175, ${scale(0.08, 0.16, surfaceStrength)})`,
            },
            dividerStyle: {
                backgroundColor: `rgba(30, 64, 175, ${scale(0.08, 0.16, surfaceStrength)})`,
            },
        };
    }

    const dp = OVERLAY_DARK.panelBase;  // '13, 15, 20'
    const dt = OVERLAY_DARK.textBase;   // '255, 255, 255'

    // Premium dark: charcoal base + off-white text + indigo accent
    return {
        shellStyle: {
            backgroundColor: `rgba(${dp}, ${scale(0.88, 0.96, surfaceStrength)})`,
            borderColor: `rgba(${dt}, ${scale(0.06, 0.1, surfaceStrength)})`,
            boxShadow: 'none',
            backdropFilter: `blur(${scale(4, 24, blurStrength)}px) saturate(160%)`,
            WebkitBackdropFilter: `blur(${scale(4, 24, blurStrength)}px) saturate(160%)`,
        },
        pillStyle: {
            backgroundColor: `rgba(${dp}, ${scale(0.86, 0.94, surfaceStrength)})`,
            borderColor: `rgba(${dt}, ${scale(0.06, 0.1, surfaceStrength)})`,
            boxShadow: 'none',
            backdropFilter: `blur(${scale(3, 16, blurStrength)}px) saturate(150%)`,
            WebkitBackdropFilter: `blur(${scale(3, 16, blurStrength)}px) saturate(150%)`,
        },
        transcriptStyle: {
            backgroundColor: 'transparent',
            borderBottomColor: 'transparent',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
        },
        subtleStyle: {
            backgroundColor: `rgba(${dt}, ${scale(0.02, 0.05, surfaceStrength)})`,
            borderColor: `rgba(${dt}, ${scale(0.05, 0.09, surfaceStrength)})`,
        },
        chipStyle: {
            backgroundColor: `rgba(${dt}, ${scale(0.04, 0.07, surfaceStrength)})`,
            borderColor: `rgba(${dt}, ${scale(0.07, 0.11, surfaceStrength)})`,
        },
        inputStyle: {
            backgroundColor: `rgba(${dt}, ${scale(0.03, 0.06, surfaceStrength)})`,
            borderColor: `rgba(${dt}, ${scale(0.07, 0.12, surfaceStrength)})`,
        },
        controlStyle: {
            backgroundColor: `rgba(${dt}, ${scale(0.03, 0.06, surfaceStrength)})`,
            borderColor: `rgba(${dt}, ${scale(0.07, 0.12, surfaceStrength)})`,
        },
        iconStyle: {
            backgroundColor: `rgba(${dt}, ${scale(0.04, 0.07, surfaceStrength)})`,
        },
        codeBlockStyle: {
            backgroundColor: `rgba(0, 0, 0, ${scale(0.28, 0.52, surfaceStrength)})`,
            borderColor: `rgba(${dt}, ${scale(0.06, 0.1, surfaceStrength)})`,
        },
        codeHeaderStyle: {
            backgroundColor: `rgba(${dt}, ${scale(0.03, 0.06, surfaceStrength)})`,
            borderBottomColor: `rgba(${dt}, ${scale(0.07, 0.11, surfaceStrength)})`,
        },
        dividerStyle: {
            backgroundColor: `rgba(${dt}, ${scale(0.07, 0.12, surfaceStrength)})`,
        },
    };
};
