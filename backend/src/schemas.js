const { z } = require('zod');

const postalCodeSchema = z.string().trim().regex(/^(?:\d{5}|[1-9]\d{5})$/, 'Enter a valid 5-digit ZIP or 6-digit PIN code.');

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

const userAuthSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  zipCode: postalCodeSchema,
});

const inventorySearchSchema = z.object({
  make: z.string().trim().min(1, 'Make is required.'),
  model: z.string().trim().min(1, 'Model is required.'),
  zipCode: postalCodeSchema.optional(),
});

const cohortCreateSchema = z.object({
  target_make: z.string().trim().min(1, 'Target make is required.'),
  target_model: z.string().trim().min(1, 'Target model is required.'),
  zip_code: postalCodeSchema,
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'PIN code must be 6 digits.').optional(),
  city: z.string().trim().min(1).max(100).default('Bhubaneswar'),
  locality: z.string().trim().max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  target_size: z.number().int().min(2).max(50).optional(),
  deadline: z.iso.date().optional(),
  vehicle_id: z.uuid().optional(),
  showroom_id: z.uuid().optional(),
  max_members: z.number().int().min(2).max(50).default(10),
  urgency: z.enum(['Ready now', 'Next 30 days', 'Exploring']).default('Ready now'),
});

const showroomCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  brand: z.string().trim().max(100).optional(),
  address: z.string().trim().min(5).max(300),
  locality: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100).default('Bhubaneswar'),
  state: z.string().trim().min(2).max(100).default('Odisha'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'PIN code must be 6 digits.'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/).optional().or(z.literal('')),
  hours: z.string().trim().max(300).optional().or(z.literal('')),
});

const offerCreateSchema = z.object({
  vehicle_id: z.uuid(),
  ex_showroom_price_inr: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  dealer_discount_inr: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  stock: z.number().int().nonnegative().optional(),
  offer_note: z.string().trim().max(1000).optional(),
  valid_until: z.iso.date().optional(),
}).refine((value) => value.dealer_discount_inr < value.ex_showroom_price_inr, {
  path: ['dealer_discount_inr'],
  message: 'Dealer discount must be less than the ex-showroom price.',
});

const aiResponseSchema = z.object({
  target_group_discount_percentage: z.number().min(0).max(100),
  realistic_target_price_per_car: z.number().min(0),
  leverage_points: z.array(z.string()).min(1),
  email_script_to_dealer: z.string().min(10),
  in_person_negotiation_tactic: z.string().min(10),
});

const aiRequestSchema = z.object({
  group_size: z.number().int().min(1),
  zip_code: postalCodeSchema,
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  listed_price: z.number().int().nonnegative(),
  msrp: z.number().int().nonnegative(),
  dealer_discount_inr: z.number().int().nonnegative().optional(),
  showroom_name: z.string().trim().max(160).optional(),
  currency: z.enum(['INR', 'USD']).default('INR'),
});

module.exports = {
  loginSchema,
  userAuthSchema,
  inventorySearchSchema,
  cohortCreateSchema,
  showroomCreateSchema,
  offerCreateSchema,
  aiResponseSchema,
  aiRequestSchema,
};
