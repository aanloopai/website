import { defineCollection, z } from 'astro:content';

// Blog collection — publishing an article means dropping ONE markdown file
// into src/content/blog/. Astro content collections handle the rest
// (schema validation, getCollection/getEntry, <Content /> rendering).
const blog = defineCollection({
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

export const collections = { blog };
