import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { PORT } from '../shared/paths';

import projectsRoute from './routes/projects';
import sessionsRoute from './routes/sessions';
import tasksRoute from './routes/tasks';
import analyticsRoute from './routes/analytics';
import searchRoute from './routes/search';
import exportRoute from './routes/export';
import systemRoute from './routes/system';

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
app.route('/api', systemRoute);

// Serve static files from dist/ (production build)
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback
app.get('/*', serveStatic({ root: './dist', path: 'index.html' }));

console.log(`clarc server listening on http://0.0.0.0:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
