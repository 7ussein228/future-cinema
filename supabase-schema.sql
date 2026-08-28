-- Future Cinema - Supabase Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Insert default state
INSERT INTO app_state (id, data) VALUES ('main', '{
  "users": [],
  "movies": [],
  "showtimes": [],
  "bookings": [],
  "halls": [
    {"id": "1", "name": "1", "rows": 8, "cols": 12, "vipRows": ["A"], "capacity": 96},
    {"id": "2", "name": "2", "rows": 6, "cols": 10, "vipRows": ["A"], "capacity": 60},
    {"id": "3", "name": "3", "rows": 10, "cols": 14, "vipRows": ["A", "B"], "capacity": 140},
    {"id": "4", "name": "4", "rows": 7, "cols": 12, "vipRows": ["A"], "capacity": 84}
  ],
  "concessions": [
    {"id": "pop_sm", "name": {"en": "Popcorn Small", "ar": "فشار صغير"}, "price": 50, "image": null},
    {"id": "pop_md", "name": {"en": "Popcorn Medium", "ar": "فشار وسط"}, "price": 80, "image": null},
    {"id": "pop_lg", "name": {"en": "Popcorn Large", "ar": "فشار كبير"}, "price": 110, "image": null},
    {"id": "nachos", "name": {"en": "Nachos", "ar": "ناتشوز"}, "price": 70, "image": null},
    {"id": "soda", "name": {"en": "Soda", "ar": "مشروب غازي"}, "price": 40, "image": null},
    {"id": "water", "name": {"en": "Water", "ar": "مياه"}, "price": 30, "image": null}
  ],
  "coupons": [
    {"code": "FUTURE20", "discount": 0.2, "type": "percent", "active": true, "expiresAt": null, "minAmount": 0}
  ],
  "nextIds": {"user": 1, "movie": 1, "showtime": 1, "booking": 1, "concession": 7, "coupon": 2}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
