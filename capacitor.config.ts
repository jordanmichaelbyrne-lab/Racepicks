import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.racepicks.mobile',
  appName: 'Racepicks',
  webDir: 'capacitor-www',

  server: {
    url: 'https://racepicks.app',
    cleartext: false,
  },
};

export default config;