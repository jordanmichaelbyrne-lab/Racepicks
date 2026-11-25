import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mxgatepicks.app',
  appName: 'MX Gatepicks',
  webDir: 'capacitor-www',

  server: {
    url: 'https://www.mxgatepicks.com',
    cleartext: false,
  },
};

export default config;