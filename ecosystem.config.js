module.exports = {
    apps: [
      {
        name: "BackendAPI",
        script: "./index.js",
        watch: true,
        instances: 1,
        autorestart: true,
        max_memory_restart: "1G",
      },
    ],
  };
  