import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  // refreshToken comes from httpOnly cookie, no body needed
  // This DTO is just a placeholder for documentation clarity
});

export type LoginDto = z.infer<typeof loginSchema>;
