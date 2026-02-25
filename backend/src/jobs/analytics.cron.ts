import cron from 'node-cron';
import { prisma } from '../config/database';
import { analyticsQueue } from './analytics.queue';
import { logger } from '../utils/logger';

/**
 * Daily cron: runs at 00:05 GMT every day.
 * Queues aggregation jobs for all articles that had reads yesterday.
 */
export const startAnalyticsCron = () => {
  cron.schedule(
    '5 0 * * *',
    async () => {
      logger.info('[Cron] Running daily analytics aggregation...');

      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      try {
        // Find all articles read yesterday
        const articles = await prisma.readLog.groupBy({
          by: ['articleId'],
          where: {
            readAt: {
              gte: new Date(`${dateStr}T00:00:00.000Z`),
              lt: new Date(`${dateStr}T23:59:59.999Z`),
            },
          },
        });

        for (const { articleId } of articles) {
          await analyticsQueue.add(
            'aggregate-reads',
            { articleId, date: dateStr },
            {
              jobId: `analytics:${articleId}:${dateStr}`,
              removeOnComplete: true,
            }
          );
        }

        logger.info(`[Cron] Queued ${articles.length} analytics jobs for ${dateStr}`);
      } catch (err) {
        logger.error('[Cron] Analytics cron failed:', err);
      }
    },
    { timezone: 'UTC' }
  );

  logger.info('Analytics cron scheduled (daily at 00:05 UTC)');
};