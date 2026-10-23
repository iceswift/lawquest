# Development

## Requirements

- Node.js 22 and npm.
- Expo Go compatible with Expo SDK 54, or a compatible development build.
- Android SDK/Emulator for native Android testing; macOS is required for the iOS simulator.

## Install and Run

```sh
npm ci
npm start
```

Press `a` for an already running Android emulator, scan the QR code on a physical device, or use `npm run web` for a partial browser preview. Follow the actual URL printed by Expo. Phone and laptop should be on the same network when using LAN mode.

Expo Go does not update the installed app's launcher icon from app.json; a native build is needed to verify the application icon.

## Optional Authentication

Guest mode supports local study. To test sign-in, copy `.env.example` to `.env` and supply your own Supabase URL and public anon/publishable key. Restart Expo after changing environment variables. Configure redirect URLs in your Supabase project to match the development URL shown by the application.

`EXPO_PUBLIC_*` variables are embedded in client code. Never supply a service-role key, database password, Cloudflare API token, or other privileged credential. Database access policies must be configured before adding private user data sync.

Without authentication configuration, do not use the sign-in form; the client uses a placeholder endpoint. Full account sync and subscription billing are not implemented.

## Legal Content

The repository contains `data/legal-v3/packages/manifest.json` as a fallback catalog. It does not include the full raw datasets or generated package archives. Books refreshes the catalog from the public content Worker and installs selected languages locally. First download requires internet; no Cloudflare credentials are required to read public packages.

Content build and release scripts are maintainer tools. Rebuilding requires the separately maintained source datasets, including metadata still referenced from legal-v2 by the preparation script. They are not prerequisites for running the app. Release tooling currently contains Windows-specific npm commands and should be run in the maintainer's Windows environment. Do not run release commands merely to try the app.

The default content endpoint is in `services/legalContent.ts`. The hosted service is a development dependency without an availability guarantee. No self-contained demo dataset is bundled yet.

## Checks

```sh
npx tsc --noEmit
npm run test:services
```

Service tests exercise storage migrations, saved items, notes, highlights, registry repair, reader sidecars, and search behavior using mocked device storage. They do not prove native interaction, TTS, selection behavior, or memory stability. Run those checks on a device.

## Troubleshooting

- On Windows where PowerShell blocks npm.ps1, use `npm.cmd` or `npx.cmd`.
- If Metro cache becomes stale, run `npx expo start -c`.
- Set `ANDROID_HOME` to your SDK directory and start the emulator before pressing `a`.
- Match Expo Go to SDK 54; a newer Expo Go may not support this project.
- Use Android or iOS to evaluate native UX. Browser behavior differs for local files, text selection, and speech.
