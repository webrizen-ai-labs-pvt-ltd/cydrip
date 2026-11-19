# Contributing to CyDrip

Thanks for helping. CyDrip is maintained by Webrizen AI Labs.

## Getting set up

```bash
npm install
npx expo start --web     # browser preview — tap "Try a demo ride"
```

To run on an Android phone you need a development build (see the README). Rebuild it whenever you
add a library with native code.

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

- Add Expo packages with `npx expo install <package>` so versions match the SDK.
- Screens live in `src/app/` (Expo Router). Everything else goes in `src/components`, `src/lib`, `src/map`.
- Use the design tokens in `src/theme.ts`. Blue (`lane`) is only for the rider's route; red (`rec`) is
  only for recording and destructive actions.
- Keep ride data on the device. Don't add analytics or send location anywhere without an explicit,
  documented opt-in.

## Reporting bugs

Open an issue with your phone model, Android version, what you expected and what happened. For
GPS problems, say whether the screen was on or off and whether battery saver was enabled.
