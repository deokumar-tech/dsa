CREATE TABLE IF NOT EXISTS showrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Bhubaneswar',
  state TEXT NOT NULL DEFAULT 'Odisha',
  pincode VARCHAR(6) NOT NULL,
  lat NUMERIC(9, 6) NOT NULL,
  lng NUMERIC(9, 6) NOT NULL,
  phone VARCHAR(30),
  hours TEXT,
  photo_path TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  seed_key VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT showrooms_pincode_check CHECK (pincode ~ '^[1-9][0-9]{5}$'),
  CONSTRAINT showrooms_lat_check CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT showrooms_lng_check CHECK (lng BETWEEN -180 AND 180)
);

CREATE UNIQUE INDEX IF NOT EXISTS showrooms_seed_key_unique_idx
  ON showrooms (seed_key);
CREATE INDEX IF NOT EXISTS showrooms_coordinates_idx ON showrooms (lat, lng);
CREATE INDEX IF NOT EXISTS showrooms_pincode_idx ON showrooms (pincode);
CREATE INDEX IF NOT EXISTS showrooms_city_locality_idx ON showrooms (city, locality);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT '',
  fuel TEXT,
  body_type TEXT,
  seating INT CHECK (seating IS NULL OR seating BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vehicles_make_model_variant_unique UNIQUE (make, model, variant)
);

CREATE TABLE IF NOT EXISTS showroom_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ex_showroom_price_inr BIGINT NOT NULL CHECK (ex_showroom_price_inr > 0),
  dealer_discount_inr BIGINT NOT NULL DEFAULT 0 CHECK (dealer_discount_inr >= 0),
  stock INT CHECK (stock IS NULL OR stock >= 0),
  photo_path TEXT,
  offer_note TEXT,
  valid_until DATE,
  price_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seed_key VARCHAR(100),
  CONSTRAINT showroom_offers_showroom_vehicle_unique UNIQUE (showroom_id, vehicle_id),
  CONSTRAINT showroom_offers_discount_less_than_price_check
    CHECK (dealer_discount_inr < ex_showroom_price_inr)
);

CREATE UNIQUE INDEX IF NOT EXISTS showroom_offers_seed_key_unique_idx
  ON showroom_offers (seed_key);
CREATE INDEX IF NOT EXISTS showroom_offers_vehicle_idx ON showroom_offers (vehicle_id);
CREATE INDEX IF NOT EXISTS showroom_offers_showroom_idx ON showroom_offers (showroom_id);
CREATE INDEX IF NOT EXISTS showroom_offers_price_updated_idx ON showroom_offers (price_updated_at DESC);

CREATE TABLE IF NOT EXISTS group_discount_tiers (
  min_members INT PRIMARY KEY CHECK (min_members > 0),
  extra_discount_pct NUMERIC(5, 2) NOT NULL CHECK (extra_discount_pct BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS showroom_id UUID REFERENCES showrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Bhubaneswar',
  ADD COLUMN IF NOT EXISTS locality TEXT,
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(6),
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS target_size INT,
  ADD COLUMN IF NOT EXISTS deadline DATE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cohorts_pincode_check') THEN
    ALTER TABLE cohorts ADD CONSTRAINT cohorts_pincode_check
      CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cohorts_lat_check') THEN
    ALTER TABLE cohorts ADD CONSTRAINT cohorts_lat_check
      CHECK (lat IS NULL OR lat BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cohorts_lng_check') THEN
    ALTER TABLE cohorts ADD CONSTRAINT cohorts_lng_check
      CHECK (lng IS NULL OR lng BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cohorts_target_size_check') THEN
    ALTER TABLE cohorts ADD CONSTRAINT cohorts_target_size_check
      CHECK (target_size IS NULL OR target_size BETWEEN 2 AND 50);
  END IF;
END;
$$;

UPDATE cohorts
SET target_size = max_members
WHERE target_size IS NULL;

CREATE INDEX IF NOT EXISTS cohorts_coordinates_idx ON cohorts (lat, lng);
CREATE INDEX IF NOT EXISTS cohorts_pincode_idx ON cohorts (pincode);
CREATE INDEX IF NOT EXISTS cohorts_vehicle_location_idx ON cohorts (vehicle_id, city, created_at DESC);

ALTER TABLE showrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE showroom_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_discount_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS showrooms_public_read ON showrooms;
CREATE POLICY showrooms_public_read ON showrooms
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS vehicles_public_read ON vehicles;
CREATE POLICY vehicles_public_read ON vehicles
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS showroom_offers_public_read ON showroom_offers;
CREATE POLICY showroom_offers_public_read ON showroom_offers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS group_discount_tiers_public_read ON group_discount_tiers;
CREATE POLICY group_discount_tiers_public_read ON group_discount_tiers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cohorts_public_read ON cohorts;
CREATE POLICY cohorts_public_read ON cohorts
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('showroom-photos', 'showroom-photos', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS showroom_photos_public_read ON storage.objects;
CREATE POLICY showroom_photos_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'showroom-photos');
