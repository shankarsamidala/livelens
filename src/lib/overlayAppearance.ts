import type React from 'react';

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
const mix = (min: number, max: number, value: number) => min + ((max - min) * value);

export const OVERLAY_OPACITY_MIN = 0.35;
export const OVERLAY_OPACITY_MAX = 1;
/** @deprecated Use getDefaultOverlayOpacity() for theme-aware default. */
export const OVERLAY_OPACITY_DEFAULT = 0.65;
export const OVERLAY_OPACITY_DEFAULT_DARK = 0.80;
export const OVERLAY_OPACITY_DEFAULT_LIGHT = 0.70;

/** Returns the correct default opacity based on the currently active theme. */
export const getDefaultOverlayOpacity = (): number =>
    document.documentElement.getAttribute('data-theme') === 'light'
        ? OVERLAY_OPACITY_DEFAULT_LIGHT
        : OVERLAY_OPACITY_DEFAULT_DARK;

export const clampOverlayOpacity = (opacity: number) => clamp(opacity, OVERLAY_OPACITY_MIN, OVERLAY_OPACITY_MAX);

const normalizeOpacity = (opacity: number) =>
    (clampOverlayOpacity(opacity) - OVERLAY_OPACITY_MIN) / (OVERLAY_OPACITY_MAX - OVERLAY_OPACITY_MIN);
const scale = (min: number, max: number, strength: number, ease = 1) =>
    mix(min, max, Math.pow(clamp(strength, 0, 1), ease));

export const getOverlayAppearance = (opacity: number, theme: OverlayTheme): OverlayAppearance => {
    const strength = normalizeOpacity(opacity);
    const surfaceStrength = Math.pow(strength, 1.02);
    const blurStrength = Math.pow(strength, 0.94);

    if (theme === 'light') {
        return {
            shellStyle: {
                backgroundColor: `rgba(214, 228, 247, ${scale(0.085, 1, surfaceStrength)})`,
                borderColor: `rgba(37, 99, 235, ${scale(0.08, 0.16, surfaceStrength)})`,
                boxShadow: `0 24px 48px rgba(37, 99, 235, ${scale(0.03, 0.12, surfaceStrength)})`,
                backdropFilter: `blur(${scale(4, 18, blurStrength)}px) saturate(145%)`,
                WebkitBackdropFilter: `blur(${scale(4, 18, blurStrength)}px) saturate(145%)`,
            },
            pillStyle: {
                backgroundColor: `rgba(221, 234, 250, ${scale(0.075, 0.98, surfaceStrength)})`,
                borderColor: `rgba(37, 99, 235, ${scale(0.08, 0.16, surfaceStrength)})`,
                boxShadow: `0 12px 28px rgba(37, 99, 235, ${scale(0.02, 0.09, surfaceStrength)})`,
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

    // Inner surfaces are pinned to the exact prototype values (overlay-prototype.html).
    // Only the shell / pill backdrop + shadow scale with the opacity slider; chips,
    // inputs, controls, icons, borders, and dividers render pixel-identically to
    // the prototype regardless of opacity.
    return {
        shellStyle: {
            backgroundColor: `rgba(20, 22, 28, ${scale(0.55, 0.92, surfaceStrength)})`,
            borderColor: 'rgba(250, 249, 245, 0.09)',
            boxShadow: `0 24px 60px -20px rgba(0, 0, 0, ${scale(0.35, 0.55, surfaceStrength)})`,
            backdropFilter: `blur(${scale(6, 20, blurStrength)}px) saturate(150%)`,
            WebkitBackdropFilter: `blur(${scale(6, 20, blurStrength)}px) saturate(150%)`,
        },
        pillStyle: {
            backgroundColor: `rgba(20, 22, 28, ${scale(0.45, 0.85, surfaceStrength)})`,
            borderColor: 'rgba(250, 249, 245, 0.09)',
            boxShadow: `0 12px 28px rgba(0, 0, 0, ${scale(0.20, 0.32, surfaceStrength)})`,
            backdropFilter: `blur(${scale(4, 13, blurStrength)}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${scale(4, 13, blurStrength)}px) saturate(140%)`,
        },
        transcriptStyle: {
            backgroundColor: 'transparent',
            borderBottomColor: 'transparent',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
        },
        subtleStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.025)',
            borderColor: 'rgba(250, 249, 245, 0.06)',
        },
        chipStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.06)',
            borderColor: 'rgba(250, 249, 245, 0.06)',
        },
        inputStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.04)',
            borderColor: 'rgba(250, 249, 245, 0.09)',
        },
        controlStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.05)',
            borderColor: 'rgba(250, 249, 245, 0.06)',
        },
        iconStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.05)',
        },
        codeBlockStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.03)',
            borderColor: 'rgba(250, 249, 245, 0.08)',
        },
        codeHeaderStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.05)',
            borderBottomColor: 'rgba(250, 249, 245, 0.08)',
        },
        dividerStyle: {
            backgroundColor: 'rgba(250, 249, 245, 0.06)',
        },
    };
};

// Returns empty inline-style objects for the liquid-glass theme — CSS variable
// overrides via [data-interface-theme="liquid-glass"] handle all visual styling.
export const getGlassOverlayAppearance = (): OverlayAppearance => ({
    shellStyle: {},
    pillStyle: {},
    transcriptStyle: {},
    subtleStyle: {},
    chipStyle: {},
    inputStyle: {},
    controlStyle: {},
    iconStyle: {},
    codeBlockStyle: {},
    codeHeaderStyle: {},
    dividerStyle: {},
});
