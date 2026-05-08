import { CapacitorConfig } from '@capacitor/cli';

// In development the Vite dev server is used (no server.url needed).
// For a production build pointed at a live backend, set CAPACITOR_API_URL
// before running `npx cap sync ios`, e.g.:
//   CAPACITOR_API_URL=https://api.linkupathletics.com npx cap sync ios
const prodUrl = process.env.CAPACITOR_API_URL;

const config: CapacitorConfig = {
  appId: 'com.linkupathletics.nextgen',
  appName: 'LinkUp NextGen',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    // When CAPACITOR_API_URL is set the native app loads from the live URL
    // instead of the bundled web assets — useful for OTA updates in staging.
    // Remove this line (or leave prodUrl undefined) for a fully-offline bundle.
    ...(prodUrl ? { url: prodUrl } : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#064e3b',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#064e3b',
    },
  },
};

export default config;
