import { z } from 'zod';

// Usernames and emails are stored lowercase so "Anmol" and "anmol" can't be two different accounts
export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'must be 3-20 characters: letters, numbers or underscore'),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, 'must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});