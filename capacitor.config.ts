import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Identificador único en Google Play: no se puede cambiar después de publicar.
  appId: 'io.github.maticukier.blobalanche',
  appName: 'Blobalanche',
  webDir: 'dist',
  android: {
    // El juego no carga contenido remoto: nada de http en claro.
    allowMixedContent: false,
    backgroundColor: '#1b1430',
  },
  plugins: {
    SystemBars: {
      // Inyecta --safe-area-inset-* en el WebView (usado en index.html).
      insetsHandling: 'css',
      // Íconos claros sobre fondo oscuro.
      style: 'DARK',
    },
  },
};

export default config;
