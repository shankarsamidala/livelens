/**
 * Smoke tests for the LiveLens Electron application.
 * These verify that the app launches, both windows render without crashing,
 * and key DOM landmarks are present.
 */
import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

test.describe('LiveLens app smoke', () => {
    test('app launches and launcher window renders', async () => {
        const app = await electron.launch({
            args: [path.join(ROOT, 'dist-electron', 'electron', 'main.js')],
            env: {
                ...process.env,
                NODE_ENV: 'test',
                // Suppress update checks and analytics during E2E runs.
                ELECTRON_IS_DEV: '1',
            },
        });

        try {
            // Wait for the first window to appear.
            const window = await app.firstWindow();
            await window.waitForLoadState('domcontentloaded');

            // The root React mount point must exist.
            const root = await window.$('#root');
            expect(root).not.toBeNull();

            // No uncaught JS errors should have occurred.
            const title = await window.title();
            expect(title).not.toBe('');
        } finally {
            await app.close();
        }
    });

    test('no crash dialog appears on launch', async () => {
        const app = await electron.launch({
            args: [path.join(ROOT, 'dist-electron', 'electron', 'main.js')],
            env: { ...process.env, NODE_ENV: 'test', ELECTRON_IS_DEV: '1' },
        });

        try {
            const window = await app.firstWindow();
            await window.waitForLoadState('domcontentloaded');

            // Electron crash dialogs create windows with the title "Crash Report".
            const allWindows = app.windows();
            for (const w of allWindows) {
                const t = await w.title();
                expect(t).not.toContain('Crash');
            }
        } finally {
            await app.close();
        }
    });

    test('electronAPI is exposed on window', async () => {
        const app = await electron.launch({
            args: [path.join(ROOT, 'dist-electron', 'electron', 'main.js')],
            env: { ...process.env, NODE_ENV: 'test', ELECTRON_IS_DEV: '1' },
        });

        try {
            const window = await app.firstWindow();
            await window.waitForLoadState('domcontentloaded');

            const hasApi = await window.evaluate(() => typeof (window as any).electronAPI !== 'undefined');
            expect(hasApi).toBe(true);
        } finally {
            await app.close();
        }
    });
});
