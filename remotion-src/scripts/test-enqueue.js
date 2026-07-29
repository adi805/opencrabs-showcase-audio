const { Queue } = require('bullmq');
const q = new Queue('remotion-renders', { connection: { host: 'localhost', port: 6379 } });
q.add('render', { compId: 'PromoVideo', props: { titleText: 'BullMQ Pipeline Test' }, outPath: 'out/bullmq-test.mp4' }, { attempts: 1, removeOnComplete: false })
  .then(job => { console.log('Enqueued job ID:', job.id); return q.close(); })
  .then(() => process.exit(0))
  .catch(e => { console.error('ENQUEUE FAIL:', e.message); process.exit(1); });
