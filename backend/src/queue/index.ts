import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Track whether we've already warned about Redis being unavailable
let redisWarned = false;

const redisOptions = {
  maxRetriesPerRequest: null as unknown as number,
  retryStrategy(times: number): number | null {
    if (times === 1 && !redisWarned) {
      redisWarned = true;
      console.warn(
        '⚠️  Redis is not available at %s — Bull queues will not process jobs. ' +
        'Start Redis with: docker compose up -d',
        redisUrl
      );
    }
    // Retry with exponential backoff, capped at 30 seconds
    return Math.min(times * 2000, 30000);
  },
  enableReadyCheck: false,
};

export const audioQueue = new Queue('audio-processing', redisUrl, {
  redis: redisOptions,
});

export const consentErasureQueue = new Queue('consent-erasure', redisUrl, {
  redis: redisOptions,
});

export interface AudioJobData {
  sessionId: string;
  passageText: string;
  filePath: string;
}

// Only log queue errors that are NOT ECONNREFUSED (those are already handled by retryStrategy)
audioQueue.on('error', (error: any) => {
  if (error?.code !== 'ECONNREFUSED') {
    console.error('Bull queue error:', error);
  }
});

consentErasureQueue.on('error', (error: any) => {
  if (error?.code !== 'ECONNREFUSED') {
    console.error('Consent erasure queue error:', error);
  }
});
