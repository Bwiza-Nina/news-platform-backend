import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(150, 'Title must not exceed 150 characters'),
  content: z
    .string()
    .min(50, 'Content must be at least 50 characters'),
  category: z
    .string()
    .min(1, 'Category is required'),
  status: z
    .enum(['Draft', 'Published'])
    .optional()
    .default('Draft'),
});

export const updateArticleSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(150, 'Title must not exceed 150 characters')
    .optional(),
  content: z
    .string()
    .min(50, 'Content must be at least 50 characters')
    .optional(),
  category: z
    .string()
    .min(1, 'Category cannot be empty')
    .optional(),
  status: z
    .enum(['Draft', 'Published'])
    .optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;