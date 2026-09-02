/**
 * Zod schemas, one per input boundary. Every server action parses its input through one of these
 * before doing anything else — after the parse the data is trusted, before it nothing is.
 */
import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .email('That does not look like an email address.')
  .transform((v) => v.toLowerCase()); // the database checks this too

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

/**
 * Note the absent `role`.
 *
 * Self-registration always creates a member. Letting a form choose its own role would have made
 * Goal 1's whole manager/member split opt-in: anyone wanting portfolio-wide visibility would just
 * sign up again and tick Manager. Managers are seeded, or promoted by an existing manager — a
 * privilege is granted, never self-declared.
 */
export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2, 'Please give your full name.').max(80),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
});

export const projectSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, 'Use 2–10 letters or digits, starting with a letter, e.g. ACME.'),
  name: z.string().trim().min(2, 'Give the project a name.').max(120),
  description: z.string().trim().max(2000).default(''),
  ownerId: z.string().uuid('Choose an owner.'),
});

export const projectEditSchema = projectSchema.omit({ key: true });

export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Give the task a title.').max(200),
  description: z.string().trim().max(5000).default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.')
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write something first.').max(4000),
});

/** Turns a Zod failure into the first readable message, which is all the forms show. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'That input was not valid.';
}
