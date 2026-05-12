import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface ModelState {
    currentModel: string;
    setCurrentModel: (model: string) => void;
}

/**
 * Holds the active LLM model id.
 * Synced with the main process via the `onModelChanged` IPC event —
 * call `syncFromIpc()` once in the root component to wire the subscription.
 */
export const useModelStore = create<ModelState>()(
    subscribeWithSelector((set) => ({
        currentModel: '',
        setCurrentModel: (model) => set({ currentModel: model }),
    }))
);

/** Wire up the IPC → store sync. Call once at app startup. */
export function syncModelFromIpc(): () => void {
    // Fetch the current model immediately.
    window.electronAPI?.getDefaultModel?.().then(({ model }) => {
        useModelStore.getState().setCurrentModel(model);
    }).catch(() => {});

    // Keep the store in sync with main-process changes.
    if (!window.electronAPI?.onModelChanged) return () => {};
    return window.electronAPI.onModelChanged((modelId) => {
        useModelStore.getState().setCurrentModel(modelId);
    });
}
