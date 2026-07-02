import express from 'express';
import path from 'path';
import cors from 'cors';
import morgan from 'morgan';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';
import { rateLimiter } from './middlewares/rateLimiter';
import { env } from './config/env';

// Route imports
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import appointmentRoutes from './routes/appointment.routes';
import adminRoutes from './routes/admin.routes';
import categoryRoutes from './routes/category.routes';
import serviceRoutes from './routes/service.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// Behind Vercel/nginx: trust the first proxy so req.ip is the real client IP
// (required for correct per-client rate limiting).
app.set('trust proxy', 1);

// ─── Global Middleware ─────────────────────────────────────────────────────

// CORS — only allow whitelisted origins (configured in .env)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24h
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.logLevel));
app.use(rateLimiter);

// ─── Swagger Docs (Express v5 compatible) ──────────────────────────────────
// swagger-ui-express is NOT compatible with Express v5, so we serve it manually
// using swagger-ui-dist (which is bundled inside swagger-ui-express)

const swaggerUiDistPath = path.dirname(
  require.resolve('swagger-ui-dist/package.json')
);

// Serve the main Swagger UI page with our spec injected
// IMPORTANT: this must be defined BEFORE the static middleware
app.get('/api/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Otolor API Documentation</title>
      <link rel="stylesheet" href="/api/docs-assets/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
        .swagger-ui .topbar { display: none; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="/api/docs-assets/swagger-ui-bundle.js"></script>
      <script src="/api/docs-assets/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
            spec: ${JSON.stringify(swaggerSpec)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
          });
        };
      </script>
    </body>
    </html>
  `);
});

// Serve swagger-ui static assets (CSS, JS, etc.) under a separate path
app.use('/api/docs-assets', express.static(swaggerUiDistPath));

// Expose swagger spec as JSON
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin/appointments', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/uploads', uploadRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ─── Global Error Handler (must be last) ───────────────────────────────────
app.use(errorHandler);

export default app;
