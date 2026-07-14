import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.linkupathletics.app',
  appName: 'LinkUp Athletics',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    url: 'https://linkup-swpu.onrender.com',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#09090b',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#1e3a5f',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false, // not used — excludes Facebook SDK and AD_ID permission
        apple: true,
        twitter: false,
      },
    },
  },
};

export default config;
