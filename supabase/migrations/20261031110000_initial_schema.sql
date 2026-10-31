CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seed_key VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INT NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  trim VARCHAR(100) NOT NULL DEFAULT '',
  listed_price DECIMAL(10, 2) NOT NULL CHECK (listed_price >= 0),
  msrp DECIMAL(10, 2) NOT NULL CHECK (msrp >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seed_key VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_make VARCHAR(100) NOT NULL,
  target_model VARCHAR(100) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'forming',
  max_members INT NOT NULL DEFAULT 10 CHECK (max_members BETWEEN 2 AND 50),
  urgency VARCHAR(50) NOT NULL DEFAULT 'Ready now',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  seed_key VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cohort_id, user_id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE dealerships
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS seed_key VARCHAR(100);

ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS seed_key VARCHAR(100);

UPDATE inventory SET trim = '' WHERE trim IS NULL;
ALTER TABLE inventory ALTER COLUMN trim SET DEFAULT '';
ALTER TABLE inventory ALTER COLUMN trim SET NOT NULL;

ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS max_members INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS urgency VARCHAR(50) NOT NULL DEFAULT 'Ready now',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seed_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS dealerships_name_address_unique_idx
  ON dealerships (name, address);

CREATE UNIQUE INDEX IF NOT EXISTS dealerships_seed_key_unique_idx
  ON dealerships (seed_key);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_seed_key_unique_idx
  ON inventory (seed_key);

CREATE UNIQUE INDEX IF NOT EXISTS cohorts_seed_key_unique_idx
  ON cohorts (seed_key);

CREATE INDEX IF NOT EXISTS inventory_vehicle_search_idx
  ON inventory (lower(make), lower(model), year, listed_price);

CREATE INDEX IF NOT EXISTS dealerships_zip_code_idx ON dealerships (zip_code);
CREATE INDEX IF NOT EXISTS dealerships_zip_area_idx ON dealerships (left(zip_code, 3));
CREATE INDEX IF NOT EXISTS cohorts_vehicle_location_idx
  ON cohorts (lower(target_make), lower(target_model), zip_code, created_at DESC);
CREATE INDEX IF NOT EXISTS cohorts_zip_area_idx
  ON cohorts (left(zip_code, 3), lower(target_make), lower(target_model), created_at DESC);
CREATE INDEX IF NOT EXISTS cohort_members_user_idx ON cohort_members (user_id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, zip_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'zip_code', ''), '00000')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_read_own_profile ON users;
CREATE POLICY users_read_own_profile ON users
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own_profile ON users;
CREATE POLICY users_update_own_profile ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS dealerships_read_authenticated ON dealerships;
CREATE POLICY dealerships_read_authenticated ON dealerships
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS inventory_read_authenticated ON inventory;
CREATE POLICY inventory_read_authenticated ON inventory
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cohorts_read_authenticated ON cohorts;
CREATE POLICY cohorts_read_authenticated ON cohorts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cohort_members_read_if_member ON cohort_members;
CREATE OR REPLACE FUNCTION public.is_cohort_member(target_cohort_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cohort_members
    WHERE cohort_id = target_cohort_id
      AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_cohort_member(UUID) TO authenticated;

CREATE POLICY cohort_members_read_if_member ON cohort_members
  FOR SELECT TO authenticated USING (public.is_cohort_member(cohort_id));
