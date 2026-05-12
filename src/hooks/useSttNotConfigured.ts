import { useState, useEffect } from 'react';

/**
 * Returns true when the active STT provider is 'none' (no STT configured).
 * Stays in sync with live provider changes while a meeting is active.
 */
export function useSttNotConfigured(): boolean {
    const [notConfigured, setNotConfigured] = useState(false);

    useEffect(() => {
        let mounted = true;

        window.electronAPI
            ?.getSttProvider?.()
            .then((provider: string) => {
                if (mounted) setNotConfigured(provider === 'none');
            })
            .catch(() => {});

        const unsub = window.electronAPI?.onSttConfigChanged?.((data) => {
            if (mounted) setNotConfigured(!data.configured);
        });

        return () => {
            mounted = false;
            unsub?.();
        };
    }, []);

    return notConfigured;
}
