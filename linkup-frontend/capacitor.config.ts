import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.linkupathletics.app',
  appName: 'LinkUp Athletics',
  webDir: 'build',
  server: {
    androidScheme: 'https',
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
