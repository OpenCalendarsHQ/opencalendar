# OpenCalendar Release Process

## Prerequisites

1. **Generate Tauri Signing Keys** (first time only):
   ```bash
   cd opencalendar-desktop
   npm run tauri signer generate -- -w ~/.tauri/myapp.key
   ```

   This generates:
   - Private key: `~/.tauri/myapp.key`
   - Public key: Printed to console

2. **Add Public Key to tauri.conf.json**:
   - Copy the public key from step 1
   - Update `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`

3. **Add Secrets to GitHub**:
   - Go to: https://github.com/ArjandenHartog/opencalendar/settings/secrets/actions
   - Add `TAURI_SIGNING_PRIVATE_KEY`: Content of `~/.tauri/myapp.key`
   - Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Password you set (if any)

## Release Steps

### 1. Update Version

```bash
cd opencalendar-desktop
npm version patch  # For bug fixes (0.1.0 → 0.1.1)
npm version minor  # For new features (0.1.0 → 0.2.0)
npm version major  # For breaking changes (0.1.0 → 1.0.0)
```

This automatically updates:
- `package.json` version
- `src-tauri/tauri.conf.json` version
- `src-tauri/Cargo.toml` version

### 2. Commit and Tag

```bash
git add .
git commit -m "chore: bump version to v0.1.1"
git tag v0.1.1
git push origin master
git push origin v0.1.1
```

### 3. GitHub Actions Builds

The workflow will automatically:
1. Create a GitHub release
2. Build for Windows, macOS, and Linux
3. Upload installers to the release
4. Generate `latest.json` for auto-updates

### 4. Verify Release

1. Go to: https://github.com/ArjandenHartog/opencalendar/releases
2. Check that all installers are uploaded
3. Test download and installation on each platform

## Auto-Update

The desktop app checks for updates on startup and every 24 hours. Users will see a dialog when a new version is available.

### Manual Update Check

Add this to your app (optional):
```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function checkForUpdates() {
  const update = await check();
  if (update?.available) {
    await update.downloadAndInstall();
    await relaunch();
  }
}
```

## Troubleshooting

### Build Fails on macOS
- Make sure you have Xcode Command Line Tools installed
- Run: `xcode-select --install`

### Build Fails on Linux
- Install required dependencies:
  ```bash
  sudo apt-get update
  sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```

### Signature Verification Fails
- Check that the public key in `tauri.conf.json` matches your private key
- Verify that `TAURI_SIGNING_PRIVATE_KEY` secret is set correctly

## Version History

- `v0.1.0` - Initial release
