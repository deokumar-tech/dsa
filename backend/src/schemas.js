const { z } = require('zod');

const zipCodeSchema = z.string().trim().regex(/^\d{5}$/, 'Zip code must be 5 digits.');

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

const userAuthSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  zipCode: zipCodeSchema,
});

const inventorySearchSchema = z.object({
  make: z.string().trim().min(1, 'Make is required.'),
  model: z.string().trim().min(1, 'Model is required.'),
  zipCode: z.string().trim().regex(/^\d{5}$/, 'Zip code must be 5 digits.').optional(),
});

const cohortCreateSchema = z.object({
  target_make: z.string().trim().min(1, 'Target make is required.'),
  target_model: z.string().trim().min(1, 'Target model is required.'),
  zip_code: zipCodeSchema,
  max_members: z.number().int().min(2).max(50).default(10),
  urgency: z.enum(['Ready now', 'Next 30 days', 'Exploring']).default('Ready now'),
});

const aiResponseSchema = z.object({
  target_group_discount_percentage: z.number().min(0).max(100),
  realistic_target_price_per_car: z.number().min(0),
  leverage_points: z.array(z.string()).min(1),
  email_script_to_dealer: z.string().min(10),
  in_person_negotiation_tactic: z.string().min(10),
});

module.exports = {
  loginSchema,
  userAuthSchema,
  inventorySearchSchema,
  cohortCreateSchema,
  aiResponseSchema,
};
