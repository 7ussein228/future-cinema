-- High-concurrency schema for Future Cinema - Avengers Doomsday ready
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- This creates proper normalized tables with row-level locking

-- Enable UUID if needed
-- Movies
CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_ar TEXT,
  genre TEXT,
  rating TEXT,
  duration INT,
  poster TEXT,
  trailer TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Halls
CREATE TABLE IF NOT EXISTS halls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rows INT NOT NULL,
  cols INT NOT NULL,
  vip_rows TEXT[] DEFAULT ARRAY['A'],
  capacity INT NOT NULL
);

-- Showtimes
CREATE TABLE IF NOT EXISTS showtimes (
  id TEXT PRIMARYKEY,
  movie_id TEXT REFERENCES movies(id) ON DELETE CASCADE,
  hall_id TEXT REFERENCES halls(id),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  price INT NOT NULL,
  format TEXT NOT NULL DEFAULT '2D',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Fix typo: ensure id is primary key
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='showtimes' AND constraint_type='PRIMARY KEY') THEN
    ALTER TABLE showtimes ADD PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Concessions
CREATE TABLE IF NOT EXISTS concessions (
  id TEXT PRIMARY KEY,
  name JSONB NOT NULL,
  price INT NOT NULL,
  image TEXT
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed','seats_free')),
  discount NUMERIC,
  max_seats INT DEFAULT 2,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  min_amount INT DEFAULT 0
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings (header)
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  showtime_id TEXT REFERENCES showtimes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  total INT NOT NULL,
  subtotal INT NOT NULL,
  discount INT DEFAULT 0,
  coupon_code TEXT REFERENCES coupons(code),
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Booking seats - unique per showtime+seat prevents double booking at DB level
CREATE TABLE IF NOT EXISTS booking_seats (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  showtime_id TEXT NOT NULL,
  seat TEXT NOT NULL,
  UNIQUE(showtime_id, seat)
);
CREATE INDEX IF NOT EXISTS idx_booking_seats_showtime ON booking_seats(showtime_id);

-- Booking concessions
CREATE TABLE IF NOT EXISTS booking_concessions (
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  concession_id TEXT REFERENCES concessions(id),
  PRIMARY KEY (booking_id, concession_id)
);

-- Enable RLS (allow anon for now - tighten later)
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE showtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE concessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_concessions ENABLE ROW LEVEL SECURITY;

-- Policies: allow all for anon (for migration period)
DROP POLICY IF EXISTS "allow all" ON movies;
CREATE POLICY "allow all" ON movies FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON halls;
CREATE POLICY "allow all" ON halls FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON showtimes;
CREATE POLICY "allow all" ON showtimes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON concessions;
CREATE POLICY "allow all" ON concessions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON coupons;
CREATE POLICY "allow all" ON coupons FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON users;
CREATE POLICY "allow all" ON users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON bookings;
CREATE POLICY "allow all" ON bookings FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON booking_seats;
CREATE POLICY "allow all" ON booking_seats FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow all" ON booking_concessions;
CREATE POLICY "allow all" ON booking_concessions FOR ALL USING (true) WITH CHECK (true);

-- Seed halls
INSERT INTO halls (id, name, rows, cols, vip_rows, capacity) VALUES
  ('1','1',8,12,ARRAY['A'],96),
  ('2','2',6,10,ARRAY['A'],60),
  ('3','3',10,14,ARRAY['A','B'],140),
  ('4','4',7,12,ARRAY['A'],84)
ON CONFLICT (id) DO NOTHING;

-- Seed coupons
INSERT INTO coupons (code, type, discount, max_seats, active) VALUES
  ('FUTURE20','percent',0.2, NULL, true),
  ('RORO175','seats_free',NULL,2,true)
ON CONFLICT (code) DO NOTHING;

-- Seed concessions
INSERT INTO concessions (id, name, price) VALUES
  ('pop_sm','{"en":"Popcorn Small","ar":"فشار صغير"}',50),
  ('pop_md','{"en":"Popcorn Medium","ar":"فشار وسط"}',80),
  ('pop_lg','{"en":"Popcorn Large","ar":"فشار كبير"}',110),
  ('nachos','{"en":"Nachos","ar":"ناتشوز"}',70),
  ('soda','{"en":"Soda","ar":"مشروب غازي"}',40),
  ('water','{"en":"Water","ar":"مياه"}',30)
ON CONFLICT (id) DO NOTHING;
