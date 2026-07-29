#!/usr/bin/env node
/**
 * BullMQ worker — consumes render jobs from Redis queue.
 * concurrency: 1 prevents CPU thrashing on a single VPS.
 * Worker respects render_pause.lock created by monitor-vps.sh.
 */
const { Worker, Queue } = require('bullmq');
const fs = require('fs');
const path = require('path');
const { triggerRender } = require('./render-trigger');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const QUEUE_NAME = 'remotion-renders';
const PAUSE_LOCK = path.resolve(__dirname, '..', 'render_pause.lock');

const connection = { host: REDIS_HOST, port: REDIS_PORT };

// Queue (exposed for producers)
const renderQueue = new Queue(QUEUE_NAME, { connection });

async function enqueue(compId, props, outPath) {
  const job = await renderQueue.add(
    'render',
    { compId, props, outPath },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 86400 },
    }
  );
  console.log(`[enqueue] Job ${job.id} added: ${compId} -> ${outPath}`);
  return job.id;
}

// Worker
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    // Respect monitor-vps.sh pause lock
    while (fs.existsSync(PAUSE_LOCK)) {
      console.log(`[worker] System busy (lock present), waiting 30s...`);
      await new Promise((r) => setTimeout(r, 30000));
    }

    const { compId, props, outPath } = job.data;
    console.log(`[worker] Job ${job.id}: ${compId} -> ${outPath}`);
    const result = await triggerRender(compId, props, outPath);
    return { path: result };
  },
  { connection, concurrency: 1 }
);

worker.on('completed', (job, result) => {
  console.log(`[worker] Job ${job.id} completed: ${result.path}`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed: ${err.message}`);
});

if (require.main === module) {
  console.log(`[worker] Listening on redis://${REDIS_HOST}:${REDIS_PORT} queue=${QUEUE_NAME}`);
}

module.exports = { renderQueue, enqueue };
