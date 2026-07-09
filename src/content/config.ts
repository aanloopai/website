import { defineCollection, z } from 'astro:content';

// Kennisbank markdown collection — publishing an article means dropping ONE
// markdown file into src/content/kennisbank/. Astro content collections
// handle the rest (schema validation, getCollection/getEntry, <Content /> rendering).
// Served at /kennisbank/<slug>/ alongside the existing src/pages/kennisbank/*.astro
// articles and merged into the src/pages/kennisbank.astro listing.
const kennisbank = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    excerpt: z.string(),
    published: z.coerce.date(),
    category: z.string(),
    readingMinutes: z.number().optional(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { kennisbank };
