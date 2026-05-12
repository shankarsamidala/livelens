import { useState, useEffect } from 'react';

export function useMousePassthrough() {
    const [isMousePassthrough, setIsMousePassthrough] = useState(false);

    useEffect(() => {
        window.electronAPI
            ?.getOverlayMousePassthrough?.()
            .then(setIsMousePassthrough)
            .catch(() => {});

        const unsub = window.electronAPI?.onOverlayMousePassthroughChanged?.((v) => setIsMousePassthrough(v));
        return () => unsub?.();
    }, []);

    return { isMousePassthrough, setIsMousePassthrough };
}
