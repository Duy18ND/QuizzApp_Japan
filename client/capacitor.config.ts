import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.nihongo.quizzapp',
  appName: 'Nihongo 問',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#0284C7',
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
};

export default config;
