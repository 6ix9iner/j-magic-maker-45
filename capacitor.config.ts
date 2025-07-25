import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.posapp.app',
  appName: 'Insight Inventory',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  ios: {
    // This is required for OneSignal as per official docs
    handleApplicationNotifications: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // disables native splash
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      backgroundColor: '#000000', // fills upper curved area with black
      style: 'DARK', // ensures icons are visible on black
      overlay: false // app content stays below status bar
    },
  },
};

export default config;
