import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: 'https://aanloop.ai',

  integrations: [
    tailwind(),
  ],

  output: "hybrid",
  compressHTML: true,

  build: {
    inlineStylesheets: 'auto',
  },

  adapter: cloudflare()
});