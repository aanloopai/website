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
      filter: (page) => !page.includes('/bedankt') && !page.includes('/demo-bedankt') && !page.includes('/demo-bevestigd') && !page.includes('/demo-herplannen') && !page.includes('/demo-inplannen') && !page.includes('/aanvragen') && !page.includes('/cookies') && !page.includes('/disclaimer') && !page.includes('/privacy') && !page.includes('/voorwaarden'),
      serialize: (item) => {
        // Hoge prioriteit voor kernpagina's
        const url = item.url;
        let priority = 0.7;
        if (url === 'https://aanloopai.nl/') priority = 1.0;
        else if (url.includes('/gratis-ai-scan')) priority = 0.95;
        else if (url.includes('/diensten/')) priority = 0.9;
        else if (url.includes('/tarieven')) priority = 0.9;
        else if (url.includes('/sectoren/')) priority = 0.85;
        else if (url.includes('/kennisbank/')) priority = 0.8;
        else if (url.includes('/locaties/')) priority = 0.75;
        else if (url.includes('/over')) priority = 0.7;
        return { ...item, priority, lastmod: new Date().toISOString() };
      },
    }),
  ],
  output: 'static',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
