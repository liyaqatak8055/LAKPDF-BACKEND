export function createAsyncQueue(options = {}) {
  const concurrency = Math.max(1, Number(options.concurrency) || 8);
  const maxQueueSize = Math.max(1, Number(options.maxQueueSize) || 200);
  const taskTimeoutMs = Math.max(1_000, Number(options.taskTimeoutMs) || 45_000);

  let activeCount = 0;
  const queue = [];

  const runNext = () => {
    if (activeCount >= concurrency) return;
    const next = queue.shift();
    if (!next) return;

    activeCount += 1;
    const timeout = setTimeout(() => {
      next.reject(new Error("AI queue task timeout"));
      activeCount -= 1;
      runNext();
    }, taskTimeoutMs);

    Promise.resolve()
      .then(next.task)
      .then((result) => {
        clearTimeout(timeout);
        next.resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        next.reject(error);
      })
      .finally(() => {
        activeCount -= 1;
        runNext();
      });
  };

  const enqueue = (task) =>
    new Promise((resolve, reject) => {
      if (typeof task !== "function") {
        reject(new Error("Task must be a function"));
        return;
      }
      if (queue.length >= maxQueueSize) {
        reject(new Error("AI queue is full"));
        return;
      }
      queue.push({ task, resolve, reject });
      runNext();
    });

  const stats = () => ({
    concurrency,
    maxQueueSize,
    taskTimeoutMs,
    activeCount,
    queuedCount: queue.length,
  });

  return { enqueue, stats };
}
