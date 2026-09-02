import cluster from "cluster";
import os from "os";

const cpuCount = os.cpus().length;
const requestedWorkers = Number(process.env.WEB_CONCURRENCY || 0);
const workerCount = Math.max(1, requestedWorkers || Math.min(cpuCount, 4));

if (cluster.isPrimary) {
  console.log(`[Cluster] Primary PID ${process.pid} starting ${workerCount} workers`);

  for (let i = 0; i < workerCount; i += 1) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.error(
      `[Cluster] Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Restarting...`
    );
    cluster.fork();
  });
} else {
  await import("./index.js");
}
