import { useState, useEffect } from 'react';

export function useActionButtonMode() {
    const [actionButtonMode, setActionButtonMode] = useState<'recap' | 'brainstorm'>('recap');

    useEffect(() => {
        window.electronAPI
            ?.getActionButtonMode?.()
            ?.then((mode: 'recap' | 'brainstorm') => {
                if (mode) setActionButtonMode(mode);
            })
            .catch(() => {});

        const unsub = window.electronAPI?.onActionButtonModeChanged?.((mode) => {
            setActionButtonMode(mode);
        });
        return () => unsub?.();
    }, []);

    return { actionButtonMode, setActionButtonMode };
}
