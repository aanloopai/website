import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aanloopai.nl',
  integrations: [
    tailwind(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !page.includes('/bedankt') && !page.includes('/demo-bedankt') && !page.includes('/demo-bevestigd') && !page.includes('/demo-herplannen') && !page.includes('/demo-inplannen') && !page.includes('/aanvragen') && !page.includes('/cookies') && !page.includes('/disclaimer') && !page.includes('/privacy') && !page.includes('/voorwaarden'),
      serialize: (item) => {
        // Hoge prioriteit voor kernpagina's
        if (item.url === 'https://aanloopai.nl/') item.priority = 1.0;
        if (item.url.includes('/diensten/')) item.priority = 0.9;
        if (item.url.includes('/sectoren/')) item.priority = 0.85;
        if (item.url.includes('/kennisbank/')) item.priority = 0.8;
        if (item.url.includes('/locaties/')) item.priority = 0.75;
        if (item.url.includes('/gratis-ai-scan')) item.priority = 0.95;
        if (item.url.includes('/tarieven')) item.priority = 0.9;
        if (item.url.includes('/over')) item.priority = 0.7;
        return item;
      },
    }),
  ],
  output: 'static',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
