import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// Sitemap is shipped as a static public/sitemap.xml — @astrojs/sitemap@3.7.2 is
// incompatible with Astro 4.16 (_routes.reduce crash on build:done hook).
// Static sitemap regenerated post-build via scripts/build-sitemap.sh.
export default defineConfig({
  site: 'https://aanloopai.nl',
  // global.css already carries the @tailwind directives (every layout imports
  // it), so the integration must not inject a second base stylesheet.
  integrations: [tailwind({ applyBaseStyles: false }), react()],
  output: 'static',
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'viewport',
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
