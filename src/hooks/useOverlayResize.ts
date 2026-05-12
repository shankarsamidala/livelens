import { useEffect, useLayoutEffect, RefObject } from 'react';

/**
 * Pushes accurate content dimensions to the Electron main process whenever the
 * overlay panel resizes. Three strategies are combined:
 *  1. ResizeObserver — continuous, catches all layout changes.
 *  2. attachedContext dependency — fires when screenshots are added/removed.
 *  3. 600 ms safety timeout — catches any deferred renders that the observer misses.
 */
export function useOverlayResize(
    contentRef: RefObject<HTMLDivElement | null>,
    attachedContext: unknown[]
) {
    const pushDimensions = (el: Element) => {
        const rect = el.getBoundingClientRect();
        window.electronAPI?.updateContentDimensions({
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height),
        });
    };

    useLayoutEffect(() => {
        if (!contentRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) pushDimensions(entry.target);
        });
        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!contentRef.current) return;
        requestAnimationFrame(() => {
            if (contentRef.current) pushDimensions(contentRef.current);
        });
    }, [attachedContext]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (contentRef.current) pushDimensions(contentRef.current);
        }, 600);
        return () => clearTimeout(t);
    }, []);
}
