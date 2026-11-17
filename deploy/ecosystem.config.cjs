// PM2 settings for the Premium Construction Group website on the VPS.
// Lives at /var/www/premium-construction/current/ecosystem.config.cjs.
// The running code is /var/www/premium-construction/current (a link to the latest release).
// Uploaded media lives in /var/www/premium-construction/shared/uploads, so deploys never touch it.
module.exports = {
  apps: [
    {
      name: 'premium-construction',
      cwd: '/var/www/premium-construction/current',
      script: 'server.js',
      exec_mode: 'fork', // one process is plenty for this site and uses the least memory
      instances: 1,
      // --env-file reads the secrets (needs Node 20.6+). The heap limit keeps memory predictable.
      node_args: ['--env-file=/var/www/premium-construction/.env', '--max-old-space-size=320'],
      max_memory_restart: '500M', // safety net: restart if it ever grows past this
      env: {
        NODE_ENV: 'production',
        PORT: '3040', // OakEliteHome uses 3020, mobile-massage 3030; change if 3040 is taken
        HOSTNAME: '127.0.0.1', // only Caddy can reach it
        NEXT_TELEMETRY_DISABLED: '1',
      },
      time: true,
    },
  ],
};
