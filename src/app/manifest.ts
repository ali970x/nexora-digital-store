import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexora — Digital life, delivered',
    short_name: 'Nexora',
    description: 'Top-ups, subscriptions, gift cards, and digital services in one trusted wallet.',
    start_url: '/en',
    display: 'standalone',
    background_color: 'rgb(10, 10, 15)',
    theme_color: 'rgb(10, 10, 15)',
    icons: [
      {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png'},
      {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png'},
      {src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'}
    ]
  };
}
