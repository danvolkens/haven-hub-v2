import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'haven-hub',
  runtime: 'node',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',

  // Default retry configuration
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },

  // Task directories
  dirs: ['./trigger'],

  // Machine configuration
  machine: 'small-1x',

  // Max duration for tasks
  maxDuration: 300, // 5 minutes
});
