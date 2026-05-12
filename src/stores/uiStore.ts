import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { readStoredOpacity, clampOverlayOpacity } from '../lib/overlayAppearance';
import { storage, STORAGE_KEYS } from '../lib/storage';
import type { ThemeState } from '../types/ipc-responses';

interface UiState {
    resolvedTheme: 'light' | 'dark';
    overlayOpacity: number;
    isUndetectable: boolean;
    setResolvedTheme: (theme: 'light' | 'dark') => void;
    setOverlayOpacity: (opacity: number) => void;
    setUndetectable: (state: boolean) => void;
}

export const useUiStore = create<UiState>()(
    subscribeWithSelector((set) => ({
        resolvedTheme: 'dark',
        overlayOpacity: readStoredOpacity(),
        isUndetectable: false,

        setResolvedTheme: (theme) => set({ resolvedTheme: theme }),

        setOverlayOpacity: (opacity) => {
            const clamped = clampOverlayOpacity(opacity);
            storage.set(STORAGE_KEYS.overlayOpacity, String(clamped));
            set({ overlayOpacity: clamped });
        },

        setUndetectable: (state) => {
            storage.set(STORAGE_KEYS.undetectable, String(state));
            set({ isUndetectable: state });
        },
    }))
);

/** Wire up the IPC → store syncs. Call once at app startup. Returns cleanup fn. */
export function syncUiFromIpc(): () => void {
    const cleanups: Array<() => void> = [];

    // Theme
    window.electronAPI?.getThemeMode?.().then(({ resolved }: ThemeState) => {
        useUiStore.getState().setResolvedTheme(resolved);
    }).catch(() => {});

    if (window.electronAPI?.onThemeChanged) {
        cleanups.push(window.electronAPI.onThemeChanged(({ resolved }) => {
            useUiStore.getState().setResolvedTheme(resolved);
        }));
    }

    // Overlay opacity from main process (e.g. changed via settings window)
    if (window.electronAPI?.onOverlayOpacityChanged) {
        cleanups.push(window.electronAPI.onOverlayOpacityChanged((opacity) => {
            useUiStore.getState().setOverlayOpacity(opacity);
        }));
    }

    // Undetectable
    window.electronAPI?.getUndetectable?.().then((state: boolean) => {
        useUiStore.getState().setUndetectable(state);
    }).catch(() => {});

    if (window.electronAPI?.onUndetectableChanged) {
        cleanups.push(window.electronAPI.onUndetectableChanged((state) => {
            useUiStore.getState().setUndetectable(state);
        }));
    }

    return () => cleanups.forEach((fn) => fn());
}
