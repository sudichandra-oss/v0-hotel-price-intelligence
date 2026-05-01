import { randomUUID } from 'crypto';
import { getMockDb, saveMockDb } from './mock-db';

export interface ScrapeJob {
  id: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  providers: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  hotelsScraped?: number;
}

const QUEUE_FILE = '/vercel/share/v0-project/data/scrape-queue.json';

function ensureQueueFile() {
  try {
    const fs = require('fs');
    if (!fs.existsSync(QUEUE_FILE)) {
      fs.writeFileSync(QUEUE_FILE, JSON.stringify({ jobs: [] }, null, 2));
    }
  } catch (e) {
    // Ignore file errors
  }
}

export function readQueue(): ScrapeJob[] {
  try {
    const fs = require('fs');
    ensureQueueFile();
    const content = fs.readFileSync(QUEUE_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.jobs || [];
  } catch (e) {
    return [];
  }
}

export function writeQueue(jobs: ScrapeJob[]) {
  try {
    const fs = require('fs');
    ensureQueueFile();
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({ jobs }, null, 2));
  } catch (e) {
    console.error('Error writing queue:', e);
  }
}

export function enqueueJob(city: string, country: string, startDate: string, endDate: string, providers: string[]): ScrapeJob {
  const job: ScrapeJob = {
    id: `job-${randomUUID()}`,
    city,
    country,
    startDate,
    endDate,
    providers,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const jobs = readQueue();
  jobs.push(job);
  writeQueue(jobs);

  return job;
}

export function getJob(id: string): ScrapeJob | null {
  const jobs = readQueue();
  return jobs.find(j => j.id === id) || null;
}

export function updateJobStatus(id: string, status: ScrapeJob['status'], data?: Partial<ScrapeJob>) {
  const jobs = readQueue();
  const index = jobs.findIndex(j => j.id === id);
  if (index >= 0) {
    jobs[index] = {
      ...jobs[index],
      status,
      ...data,
    };
    writeQueue(jobs);
    return jobs[index];
  }
  return null;
}

export function getPendingJobs(): ScrapeJob[] {
  const jobs = readQueue();
  return jobs.filter(j => j.status === 'pending');
}

export function getAllJobs(): ScrapeJob[] {
  return readQueue();
}
