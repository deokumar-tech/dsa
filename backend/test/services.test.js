const test = require('node:test');
const assert = require('node:assert/strict');
const { showroomCreateSchema, offerCreateSchema } = require('../src/schemas');
const { parseNearbyQuery, haversineDistanceKm } = require('../src/services/geo');
const { calculateGroupPrice, getGroupDiscountBasisPoints } = require('../src/services/pricing');

const tiers = [
  { min_members: 5, extra_discount_pct: 1 },
  { min_members: 10, extra_discount_pct: 2 },
  { min_members: 20, extra_discount_pct: 3 },
];

test('haversine distance is zero at the same coordinate and approximates one degree', () => {
  assert.equal(haversineDistanceKm(20.2961, 85.8245, 20.2961, 85.8245), 0);
  assert.ok(Math.abs(haversineDistanceKm(0, 0, 0, 1) - 111.195) < 0.1);
});

test('nearby query defaults to Bhubaneswar and rejects invalid bounds and PIN codes', () => {
  assert.deepEqual(
    { lat: parseNearbyQuery({}).lat, lng: parseNearbyQuery({}).lng },
    { lat: 20.2961, lng: 85.8245 },
  );
  assert.equal(parseNearbyQuery({ pincode: '751007' }).locality, 'Saheed Nagar');
  assert.throws(() => parseNearbyQuery({ pincode: '94105' }));
  assert.throws(() => parseNearbyQuery({ lat: '91', lng: '85' }));
  assert.throws(() => parseNearbyQuery({ radiusKm: '101' }));
  assert.throws(() => parseNearbyQuery({ lat: '20' }));
});

test('showroom and offer validation rejects invalid Indian PINs and price discounts', () => {
  const showroom = showroomCreateSchema.safeParse({
    name: 'Sample showroom',
    address: 'Example Road, Saheed Nagar',
    locality: 'Saheed Nagar',
    pincode: '751007',
    lat: 20.2935,
    lng: 85.8422,
  });
  assert.equal(showroom.success, true);
  assert.equal(showroomCreateSchema.safeParse({
    name: 'Sample showroom',
    address: 'Example Road, Saheed Nagar',
    locality: 'Saheed Nagar',
    pincode: '94105',
    lat: 20.2935,
    lng: 85.8422,
  }).success, false);

  const validOffer = {
    vehicle_id: 'fc79cffd-92f5-4397-a820-71d37a4e8730',
    ex_showroom_price_inr: 1000000,
    dealer_discount_inr: 50000,
  };
  assert.equal(offerCreateSchema.safeParse(validOffer).success, true);
  assert.equal(offerCreateSchema.safeParse({ ...validOffer, dealer_discount_inr: 1000000 }).success, false);
  assert.equal(offerCreateSchema.safeParse({ ...validOffer, ex_showroom_price_inr: 1000000.5 }).success, false);
});

test('group tier discount computes integer rupees at tier thresholds', () => {
  assert.equal(getGroupDiscountBasisPoints(4, tiers), 0);
  assert.equal(getGroupDiscountBasisPoints(5, tiers), 100);
  assert.equal(getGroupDiscountBasisPoints(10, tiers), 200);
  assert.equal(getGroupDiscountBasisPoints(20, tiers), 300);
  assert.equal(calculateGroupPrice(1000000, 5, tiers), 990000);
  assert.equal(calculateGroupPrice(1000000, 10, tiers), 980000);
  assert.equal(calculateGroupPrice(1000001, 20, tiers), 970000);
});
