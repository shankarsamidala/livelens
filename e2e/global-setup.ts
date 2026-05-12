import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export default async function globalSetup() {
    const root = path.resolve(__dirname, '..');

    // Skip rebuilding if dist artifacts are already fresh to speed up test runs.
    const rendererDist = path.join(root, 'dist', 'index.html');
    const electronDist = path.join(root, 'dist-electron', 'electron', 'main.js');

    if (!fs.existsSync(rendererDist)) {
        console.log('[E2E setup] Building renderer…');
        execSync('npm run build', { cwd: root, stdio: 'inherit' });
    }

    if (!fs.existsSync(electronDist)) {
        console.log('[E2E setup] Building Electron main process…');
        execSync('npm run build:electron', { cwd: root, stdio: 'inherit' });
    }
}
