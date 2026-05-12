import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface MeetingState {
    isActive: boolean;
    setActive: (active: boolean) => void;
}

/**
 * Tracks whether a meeting is currently in progress.
 * Synced via the `onMeetingStateChanged` IPC event.
 */
export const useMeetingStore = create<MeetingState>()(
    subscribeWithSelector((set) => ({
        isActive: false,
        setActive: (active) => set({ isActive: active }),
    }))
);

/** Wire up the IPC → store sync. Call once at app startup. */
export function syncMeetingFromIpc(): () => void {
    // Fetch initial state.
    window.electronAPI?.getMeetingActive?.().then((active) => {
        useMeetingStore.getState().setActive(active);
    }).catch(() => {});

    if (!window.electronAPI?.onMeetingStateChanged) return () => {};
    return window.electronAPI.onMeetingStateChanged(({ isActive }) => {
        useMeetingStore.getState().setActive(isActive);
    });
}
