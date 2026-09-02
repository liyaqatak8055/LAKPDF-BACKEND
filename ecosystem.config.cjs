module.exports = {
  apps: [
    {
      name: "lakpdf-ai-proxy",
      script: "server/cluster.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 8787,
        WEB_CONCURRENCY: 2,
      },
    },
  ],
};
