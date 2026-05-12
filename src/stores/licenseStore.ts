import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface LicenseState {
    isPremium: boolean;
    plan: string | undefined;
    setPremium: (isPremium: boolean, plan?: string) => void;
}

export const useLicenseStore = create<LicenseState>()(
    subscribeWithSelector((set) => ({
        isPremium: false,
        plan: undefined,
        setPremium: (isPremium, plan) => set({ isPremium, plan }),
    }))
);

/** Wire up IPC → store sync. Call once at app startup. */
export function syncLicenseFromIpc(): () => void {
    window.electronAPI?.licenseGetDetails?.().then(({ isPremium, plan }) => {
        useLicenseStore.getState().setPremium(isPremium, plan);
    }).catch(() => {});

    if (!window.electronAPI?.onLicenseStatusChanged) return () => {};
    return window.electronAPI.onLicenseStatusChanged(({ isPremium, plan }) => {
        useLicenseStore.getState().setPremium(isPremium, plan);
    });
}
