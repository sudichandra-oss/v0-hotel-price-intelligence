import fs from 'fs';
import path from 'path';

const MOCK_DB_PATH = path.resolve(process.cwd(), 'data/mock_db.json');

export interface MockDb {
  hotels: any[];
  room_types: any[];
  price_history: any[];
  scrape_logs: any[];
}

export function getMockDb(): MockDb {
  if (!fs.existsSync(MOCK_DB_PATH)) {
    return { hotels: [], room_types: [], price_history: [], scrape_logs: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf-8'));
  } catch (e) {
    return { hotels: [], room_types: [], price_history: [], scrape_logs: [] };
  }
}

export function saveMockDb(data: MockDb) {
  if (!fs.existsSync(path.dirname(MOCK_DB_PATH))) {
    fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
  }
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2));
}
