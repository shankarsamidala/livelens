import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: 'e2e',
    timeout: 30_000,
    fullyParallel: false,
    retries: 0,
    reporter: 'list',
    use: {
        // Electron tests use the _electron fixture; no browser needed.
    },
    projects: [
        {
            name: 'electron',
            testMatch: /\.e2e\.ts$/,
        },
    ],
    // Build the renderer and Electron main process before running E2E tests.
    // Comment these out during rapid development to skip the build step.
    globalSetup: path.resolve(__dirname, 'e2e/global-setup.ts'),
});
