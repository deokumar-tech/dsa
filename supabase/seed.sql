DELETE FROM inventory WHERE seed_key LIKE 'demo-inventory-%';
DELETE FROM cohorts WHERE seed_key IN ('demo-cohort-rav4', 'demo-cohort-model-y');
DELETE FROM dealerships WHERE seed_key LIKE 'demo-dealer-%';

INSERT INTO showrooms
  (name, brand, address, locality, city, state, pincode, lat, lng, phone, hours, verified, is_demo, seed_key)
VALUES
  ('Demo Motors, Saheed Nagar', 'Multi-brand', 'Approximate demo location, Saheed Nagar', 'Saheed Nagar', 'Bhubaneswar', 'Odisha', '751007', 20.293500, 85.842200, NULL, 'Illustrative hours — replace with showroom hours', FALSE, TRUE, 'demo-showroom-saheed-nagar'),
  ('Demo Auto, Jaydev Vihar', 'Multi-brand', 'Approximate demo location, Jaydev Vihar', 'Jaydev Vihar', 'Bhubaneswar', 'Odisha', '751013', 20.300800, 85.817000, NULL, 'Illustrative hours — replace with showroom hours', FALSE, TRUE, 'demo-showroom-jaydev-vihar'),
  ('Demo Wheels, Patia', 'Multi-brand', 'Approximate demo location, Patia', 'Patia', 'Bhubaneswar', 'Odisha', '751024', 20.355100, 85.826800, NULL, 'Illustrative hours — replace with showroom hours', FALSE, TRUE, 'demo-showroom-patia'),
  ('Demo Garage, Nayapalli', 'Multi-brand', 'Approximate demo location, Nayapalli', 'Nayapalli', 'Bhubaneswar', 'Odisha', '751012', 20.293300, 85.808100, NULL, 'Illustrative hours — replace with showroom hours', FALSE, TRUE, 'demo-showroom-nayapalli')
ON CONFLICT (seed_key) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  address = EXCLUDED.address,
  locality = EXCLUDED.locality,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  pincode = EXCLUDED.pincode,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  phone = EXCLUDED.phone,
  hours = EXCLUDED.hours,
  verified = FALSE,
  is_demo = TRUE,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO vehicles (make, model, variant, fuel, body_type, seating)
VALUES
  ('Maruti Suzuki', 'Swift', 'VXi', 'Petrol', 'Hatchback', 5),
  ('Maruti Suzuki', 'Brezza', 'ZXi', 'Petrol', 'SUV', 5),
  ('Hyundai', 'Creta', 'S', 'Petrol', 'SUV', 5),
  ('Tata', 'Nexon', 'Smart', 'Petrol', 'SUV', 5),
  ('Mahindra', 'XUV 3XO', 'MX1', 'Petrol', 'SUV', 5),
  ('Toyota', 'Urban Cruiser Hyryder', 'E NeoDrive', 'Petrol', 'SUV', 5),
  ('Kia', 'Seltos', 'HTE', 'Petrol', 'SUV', 5),
  ('Honda', 'Elevate', 'SV', 'Petrol', 'SUV', 5)
ON CONFLICT (make, model, variant) DO UPDATE SET
  fuel = EXCLUDED.fuel,
  body_type = EXCLUDED.body_type,
  seating = EXCLUDED.seating;

INSERT INTO group_discount_tiers (min_members, extra_discount_pct)
VALUES (5, 1.00), (10, 2.00), (20, 3.00)
ON CONFLICT (min_members) DO UPDATE
SET extra_discount_pct = EXCLUDED.extra_discount_pct,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO showroom_offers
  (showroom_id, vehicle_id, ex_showroom_price_inr, dealer_discount_inr, stock, offer_note, price_updated_at, seed_key)
SELECT s.id, v.id, offer.ex_price, offer.discount, offer.stock,
       'Illustrative demo price only—not a dealer quote. Replace with a verified current offer.',
       CURRENT_TIMESTAMP, offer.seed_key
FROM (VALUES
  ('demo-showroom-saheed-nagar', 'Maruti Suzuki', 'Swift', 'VXi', 750000::bigint, 12000::bigint, 3, 'demo-offer-swift-saheed'),
  ('demo-showroom-jaydev-vihar', 'Maruti Suzuki', 'Swift', 'VXi', 750000::bigint, 18000::bigint, 2, 'demo-offer-swift-jaydev'),
  ('demo-showroom-patia', 'Maruti Suzuki', 'Brezza', 'ZXi', 1150000::bigint, 22000::bigint, 2, 'demo-offer-brezza-patia'),
  ('demo-showroom-nayapalli', 'Maruti Suzuki', 'Brezza', 'ZXi', 1150000::bigint, 15000::bigint, 1, 'demo-offer-brezza-nayapalli'),
  ('demo-showroom-saheed-nagar', 'Hyundai', 'Creta', 'S', 1450000::bigint, 26000::bigint, 2, 'demo-offer-creta-saheed'),
  ('demo-showroom-patia', 'Hyundai', 'Creta', 'S', 1450000::bigint, 34000::bigint, 3, 'demo-offer-creta-patia'),
  ('demo-showroom-jaydev-vihar', 'Tata', 'Nexon', 'Smart', 950000::bigint, 14000::bigint, 2, 'demo-offer-nexon-jaydev'),
  ('demo-showroom-nayapalli', 'Tata', 'Nexon', 'Smart', 950000::bigint, 21000::bigint, 3, 'demo-offer-nexon-nayapalli'),
  ('demo-showroom-saheed-nagar', 'Mahindra', 'XUV 3XO', 'MX1', 850000::bigint, 18000::bigint, 1, 'demo-offer-xuv-saheed'),
  ('demo-showroom-patia', 'Mahindra', 'XUV 3XO', 'MX1', 850000::bigint, 12000::bigint, 2, 'demo-offer-xuv-patia'),
  ('demo-showroom-jaydev-vihar', 'Toyota', 'Urban Cruiser Hyryder', 'E NeoDrive', 1250000::bigint, 25000::bigint, 2, 'demo-offer-hyryder-jaydev'),
  ('demo-showroom-nayapalli', 'Toyota', 'Urban Cruiser Hyryder', 'E NeoDrive', 1250000::bigint, 32000::bigint, 1, 'demo-offer-hyryder-nayapalli'),
  ('demo-showroom-saheed-nagar', 'Kia', 'Seltos', 'HTE', 1090000::bigint, 17000::bigint, 2, 'demo-offer-seltos-saheed'),
  ('demo-showroom-patia', 'Kia', 'Seltos', 'HTE', 1090000::bigint, 24000::bigint, 1, 'demo-offer-seltos-patia'),
  ('demo-showroom-jaydev-vihar', 'Honda', 'Elevate', 'SV', 1150000::bigint, 16000::bigint, 2, 'demo-offer-elevate-jaydev'),
  ('demo-showroom-nayapalli', 'Honda', 'Elevate', 'SV', 1150000::bigint, 23000::bigint, 1, 'demo-offer-elevate-nayapalli')
) AS offer(showroom_key, make, model, variant, ex_price, discount, stock, seed_key)
JOIN showrooms s ON s.seed_key = offer.showroom_key
JOIN vehicles v ON v.make = offer.make AND v.model = offer.model AND v.variant = offer.variant
ON CONFLICT (showroom_id, vehicle_id) DO UPDATE SET
  ex_showroom_price_inr = EXCLUDED.ex_showroom_price_inr,
  dealer_discount_inr = EXCLUDED.dealer_discount_inr,
  stock = EXCLUDED.stock,
  offer_note = EXCLUDED.offer_note,
  price_updated_at = EXCLUDED.price_updated_at,
  seed_key = EXCLUDED.seed_key;

INSERT INTO cohorts
  (target_make, target_model, zip_code, status, max_members, urgency, seed_key,
   vehicle_id, city, locality, pincode, lat, lng, target_size, deadline)
SELECT cohort.make, cohort.model, cohort.pincode, 'forming', cohort.target_size,
       cohort.urgency, cohort.seed_key, v.id, 'Bhubaneswar', cohort.locality,
       cohort.pincode, cohort.lat, cohort.lng, cohort.target_size, CURRENT_DATE + cohort.days_left
FROM (VALUES
  ('Maruti Suzuki', 'Swift', 'VXi', '751007', 'Saheed Nagar', 20.293500::numeric, 85.842200::numeric, 10, 'Ready now', 21, 'demo-cohort-swift-saheed'),
  ('Hyundai', 'Creta', 'S', '751013', 'Jaydev Vihar', 20.300800::numeric, 85.817000::numeric, 8, 'Next 30 days', 30, 'demo-cohort-creta-jaydev'),
  ('Tata', 'Nexon', 'Smart', '751024', 'Patia', 20.355100::numeric, 85.826800::numeric, 12, 'Next 30 days', 25, 'demo-cohort-nexon-patia'),
  ('Maruti Suzuki', 'Brezza', 'ZXi', '751012', 'Nayapalli', 20.293300::numeric, 85.808100::numeric, 6, 'Exploring', 45, 'demo-cohort-brezza-nayapalli'),
  ('Toyota', 'Urban Cruiser Hyryder', 'E NeoDrive', '751016', 'Chandrasekharpur', 20.333600::numeric, 85.817400::numeric, 10, 'Ready now', 18, 'demo-cohort-hyryder-chandrasekharpur')
) AS cohort(make, model, variant, pincode, locality, lat, lng, target_size, urgency, days_left, seed_key)
JOIN vehicles v ON v.make = cohort.make AND v.model = cohort.model AND v.variant = cohort.variant
ON CONFLICT (seed_key) DO UPDATE SET
  target_make = EXCLUDED.target_make,
  target_model = EXCLUDED.target_model,
  zip_code = EXCLUDED.zip_code,
  status = EXCLUDED.status,
  max_members = EXCLUDED.max_members,
  urgency = EXCLUDED.urgency,
  vehicle_id = EXCLUDED.vehicle_id,
  city = EXCLUDED.city,
  locality = EXCLUDED.locality,
  pincode = EXCLUDED.pincode,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  target_size = EXCLUDED.target_size,
  deadline = COALESCE(cohorts.deadline, EXCLUDED.deadline);
