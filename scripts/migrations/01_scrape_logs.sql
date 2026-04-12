-- Scrape Logs Table
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website TEXT NOT NULL,
  city TEXT,
  country TEXT,
  status TEXT NOT NULL, -- 'success', 'failure', 'in_progress'
  hotels_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read on scrape_logs
CREATE POLICY "Allow public read on scrape_logs" ON scrape_logs
  FOR SELECT USING (true);
