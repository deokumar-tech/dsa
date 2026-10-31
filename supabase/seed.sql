INSERT INTO dealerships (name, address, zip_code, contact_email, contact_phone, seed_key)
VALUES
  ('North Bay Toyota', '2500 Van Ness Ave, San Francisco, CA', '94109', 'sales@northbaytoyota.com', '(415) 555-0141', 'demo-dealer-north-bay-toyota'),
  ('Mission Motors', '915 Mission St, San Francisco, CA', '94103', 'hello@missionmotors.com', '(415) 555-0193', 'demo-dealer-mission-motors'),
  ('Bay Area Honda', '6100 Auto Mall Dr, San Jose, CA', '95134', 'team@bayareahonda.example', '(408) 555-0117', 'demo-dealer-bay-area-honda')
ON CONFLICT (name, address) DO UPDATE
SET seed_key = COALESCE(dealerships.seed_key, EXCLUDED.seed_key);

INSERT INTO inventory (dealership_id, make, model, year, trim, listed_price, msrp, seed_key)
SELECT d.id, seed.make, seed.model, seed.year, seed.trim, seed.listed_price, seed.msrp, seed.seed_key
FROM (
  VALUES
    ('North Bay Toyota', '2500 Van Ness Ave, San Francisco, CA', 'Toyota', 'RAV4 Hybrid', 2024, 'XLE AWD', 38950.00, 41500.00, 'demo-inventory-north-bay-rav4'),
    ('Mission Motors', '915 Mission St, San Francisco, CA', 'Toyota', 'RAV4 Hybrid', 2024, 'Limited AWD', 41500.00, 43800.00, 'demo-inventory-mission-rav4'),
    ('Bay Area Honda', '6100 Auto Mall Dr, San Jose, CA', 'Toyota', 'Camry', 2024, 'SE', 33600.00, 35200.00, 'demo-inventory-bay-area-camry'),
    ('North Bay Toyota', '2500 Van Ness Ave, San Francisco, CA', 'Ford', 'Mustang', 2024, 'GT Premium', 44200.00, 47450.00, 'demo-inventory-north-bay-mustang'),
    ('Mission Motors', '915 Mission St, San Francisco, CA', 'Tesla', 'Model Y', 2024, 'Long Range AWD', 49800.00, 52900.00, 'demo-inventory-mission-model-y')
) AS seed(dealer_name, dealer_address, make, model, year, trim, listed_price, msrp, seed_key)
JOIN dealerships d
  ON d.name = seed.dealer_name AND d.address = seed.dealer_address
ON CONFLICT (seed_key) DO NOTHING;

INSERT INTO cohorts (target_make, target_model, zip_code, status, max_members, urgency, seed_key)
VALUES
  ('Toyota', 'RAV4 Hybrid', '94105', 'forming', 10, 'Ready now', 'demo-cohort-rav4'),
  ('Tesla', 'Model Y', '94103', 'forming', 5, 'Next 30 days', 'demo-cohort-model-y')
ON CONFLICT (seed_key) DO NOTHING;
