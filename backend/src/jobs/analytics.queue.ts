import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const QUEUE_NAME = 'analytics';

// The queue (producer side)
export const analyticsQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

/**
 * Analytics Worker (consumer side)
 *
 * Story 6: Aggregates ReadLog entries into DailyAnalytics.
 * Uses GMT timezone for date grouping.
 * Upserts: if a record exists for (articleId, date), it increments; otherwise creates.
 */
export const startAnalyticsWorker = () => {
  const worker = new Worker<{ articleId: string; date: string }>(
    QUEUE_NAME,
    async (job: Job) => {
      const { articleId, date } = job.data;

      logger.info(`[Analytics] Processing job for article=${articleId} date=${date}`);

      // Parse the target date in GMT
      const targetDate = new Date(`${date}T00:00:00.000Z`);
      const nextDate = new Date(targetDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      // Count all reads for this article on this GMT day
      const viewCount = await prisma.readLog.count({
        where: {
          articleId,
          readAt: {
            gte: targetDate,
            lt: nextDate,
          },
        },
      });

      // Upsert into DailyAnalytics
      await prisma.dailyAnalytics.upsert({
        where: {
          articleId_date: {
            articleId,
            date: targetDate,
          },
        },
        update: { viewCount },
        create: { articleId, date: targetDate, viewCount },
      });

      logger.info(`[Analytics] Upserted viewCount=${viewCount} for article=${articleId} on ${date}`);
    },
    { connection: redis }
  );

  worker.on('completed', (job) => {
    logger.info(`[Analytics Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Analytics Worker] Job ${job?.id} failed:`, err);
  });

  logger.info('✅ Analytics worker started');
  return worker;
};