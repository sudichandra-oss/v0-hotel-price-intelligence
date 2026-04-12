-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Hotels Table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rating DECIMAL(3,1),
  review_count INTEGER,
  star_category INTEGER,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  address TEXT,
  amenities TEXT[], -- Array of amenities (wifi, pool, spa, etc.)
  source TEXT, -- booking, google, agoda, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room Types Table
CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  meal_plan TEXT NOT NULL, -- 'No Meal', 'Breakfast Included', 'Half Board', 'Full Board'
  base_price DECIMAL(12,2),
  currency TEXT DEFAULT 'INR',
  capacity INTEGER,
  amenities TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(hotel_id, room_name, meal_plan)
);

-- Price History Table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  stay_date DATE NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  source TEXT,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK_IN_DATE DATE,
  CHECK_OUT_DATE DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(hotel_id, room_type_id, stay_date, source)
);

-- Price Alerts Table (for user alerts)
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'price_drop', 'competitor_undercut', 'price_spike'
  threshold DECIMAL(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  triggered_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_location ON hotels(latitude, longitude);
CREATE INDEX idx_price_history_hotel_date ON price_history(hotel_id, stay_date);
CREATE INDEX idx_price_history_room_date ON price_history(room_type_id, stay_date);
CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);

-- Enable Row Level Security
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow public read, authenticated write)
CREATE POLICY "Allow public read on hotels" ON hotels
  FOR SELECT USING (true);

CREATE POLICY "Allow public read on room_types" ON room_types
  FOR SELECT USING (true);

CREATE POLICY "Allow public read on price_history" ON price_history
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage alerts" ON price_alerts
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
