# Medik Triage — Mobile (Expo, Android-first)

## Run on your phone over WiFi (no emulator, no USB)

1. Phone and computer on the **same WiFi**.
2. Install **Expo Go** from the Play Store (it must support SDK 57 — update it).
3. On the phone: Settings → Developer options → **Wireless debugging** → ON.
   - First time only: **Pair device with pairing code**, then on this machine:
     ```sh
     export PATH=$PATH:~/Library/Android/sdk/platform-tools
     adb pair <PHONE_IP>:<PAIR_PORT>   # enter the 6-digit code
     adb connect <PHONE_IP>:<PORT>     # the "IP address & Port" shown above pairing
     ```
   - Afterwards the phone reconnects automatically; check with `adb devices`.
4. Start the dev server:
   ```sh
   npx expo start
   ```
   Press **`a`** to open on the connected phone, or scan the QR code with Expo Go.

## Later: dev build on the phone

Once native modules beyond Expo Go are added:

```sh
npx expo run:android --device "$(adb devices | awk '/_adb-tls-connect._tcp\tdevice/{print $1; exit}')"
```

## Notes

- Backend URL defaults to `https://api.medik.us.ci`; override per run with
  `EXPO_PUBLIC_BACKEND_URL=<url> npx expo start`.
- Theme tokens mirror web `src/styles/tokens.css` (see `tailwind.config.js`).
- API client (`lib/api.ts`) uses `expo/fetch` streaming, same event shapes as web.
- Before declaring anything done: `npx tsc --noEmit` (and `npx expo-doctor`).
