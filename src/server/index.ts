import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { PORT } from '../shared/paths';
import { initSync, startPeriodicSync } from '../data/sync-scheduler';

import projectsRoute from './routes/projects';
import sessionsRoute from './routes/sessions';
import tasksRoute from './routes/tasks';
import analyticsRoute from './routes/analytics';
import searchRoute from './routes/search';
import exportRoute from './routes/export';
import systemRoute from './routes/system';
import syncRoute from './routes/sync';

const app = new Hono();

// CORS for development (Vite dev server on port 5173)
app.use('/api/*', cors());

// Mount API routes
app.route('/api/projects', projectsRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/tasks', tasksRoute);
app.route('/api/analytics', analyticsRoute);
app.route('/api/search', searchRoute);
app.route('/api/export', exportRoute);
app.route('/api/sync', syncRoute);
app.route('/api', systemRoute);

// Serve static files from dist/ (production build)
// CLARC_DIST_DIR is set by the Tauri sidecar to the bundled resource path
const distRoot = process.env.CLARC_DIST_DIR || './dist';
app.use('/*', serveStatic({ root: distRoot }));

// SPA fallback
app.get('/*', serveStatic({ root: distRoot, path: 'index.html' }));

// Run initial sync, then start periodic sync
await initSync();
startPeriodicSync();

// Start the HTTP server explicitly so we can confirm it's listening
// before emitting the readiness signal for Tauri
const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(`clarc server listening on http://0.0.0.0:${server.port}`);
// Readiness signal for Tauri sidecar — do not change this format
console.log(`__CLARC_READY__ http://localhost:${server.port}`);
