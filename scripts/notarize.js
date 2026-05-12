/**
 * afterSign hook — notarizes the macOS app bundle when CI credentials are present.
 *
 * Required environment variables (set in CI / GitHub Actions secrets):
 *   APPLE_ID                  — Apple ID email used to sign in to App Store Connect
 *   APPLE_APP_SPECIFIC_PASSWORD — App-specific password generated at appleid.apple.com
 *   APPLE_TEAM_ID             — 10-character Team ID from developer.apple.com
 *
 * When these variables are absent the hook is a no-op, allowing local dev builds
 * to succeed without having notarization credentials available.
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== 'darwin') return;

    const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
    if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
        console.log('[Notarize] Skipping — APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set.');
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(appOutDir, `${appName}.app`);

    console.log(`[Notarize] Notarizing ${appPath} (team: ${APPLE_TEAM_ID}) …`);

    await notarize({
        appBundleId: context.packager.config.appId,
        appPath,
        appleId: APPLE_ID,
        appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
        teamId: APPLE_TEAM_ID,
    });

    console.log('[Notarize] Done.');
};
