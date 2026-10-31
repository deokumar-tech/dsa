const { z } = require('zod');

const CITY_CENTER = { lat: 20.2961, lng: 85.8245 };
const PINCODE_CENTERS = {
  '751007': { lat: 20.2935, lng: 85.8422, locality: 'Saheed Nagar' },
  '751013': { lat: 20.3008, lng: 85.8170, locality: 'Jaydev Vihar' },
  '751024': { lat: 20.3551, lng: 85.8268, locality: 'Patia' },
  '751016': { lat: 20.3336, lng: 85.8174, locality: 'Chandrasekharpur' },
  '751012': { lat: 20.2933, lng: 85.8081, locality: 'Nayapalli' },
  '751010': { lat: 20.3090, lng: 85.8660, locality: 'Rasulgarh' },
  '751030': { lat: 20.2520, lng: 85.7790, locality: 'Khandagiri' },
  '751001': { lat: 20.2650, lng: 85.8440, locality: 'Kharvela Nagar' },
};

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).default(25),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
  make: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  sort: z.enum(['best_discount', 'lowest_price', 'nearest']).default('best_discount'),
});

function parseNearbyQuery(query) {
  const parsed = nearbyQuerySchema.parse(query);
  if ((parsed.lat === undefined) !== (parsed.lng === undefined)) {
    throw new z.ZodError([{
      code: 'custom',
      path: ['lat', 'lng'],
      message: 'Latitude and longitude must be supplied together.',
    }]);
  }

  const pinCenter = parsed.pincode ? PINCODE_CENTERS[parsed.pincode] : null;
  return {
    ...parsed,
    lat: parsed.lat ?? pinCenter?.lat ?? CITY_CENTER.lat,
    lng: parsed.lng ?? pinCenter?.lng ?? CITY_CENTER.lng,
    locality: pinCenter?.locality ?? null,
  };
}

function haversineDistanceKm(latA, lngA, latB, lngB) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latB - latA);
  const longitudeDelta = radians(lngB - lngA);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

module.exports = {
  CITY_CENTER,
  PINCODE_CENTERS,
  nearbyQuerySchema,
  parseNearbyQuery,
  haversineDistanceKm,
};
