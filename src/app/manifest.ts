import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Self-Haul — A Private Ritual',
    short_name: 'Self-Haul',
    description: 'You already know the questions. Put them down. A private ritual to dump pressing questions into the void and answer them yourself.',
    start_url: '/',
    display: 'standalone',
    background_color: '#030306',
    theme_color: '#030306',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
