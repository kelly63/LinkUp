import { CapacitorConfig } from '@capacitor/cli';

// For a live-reload staging build pointed at the deployed backend, set:
//   CAPACITOR_API_URL=https://linkup-backend-46g1.onrender.com npx cap sync ios
const prodUrl = process.env.CAPACITOR_API_URL;

const config: CapacitorConfig = {
  appId: 'com.linkupathletics.app',
  appName: 'LinkUp Athletics',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    ...(prodUrl ? { url: prodUrl } : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#1e3a5f',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#1e3a5f',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'PASTE_WEB_CLIENT_ID_HERE',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
