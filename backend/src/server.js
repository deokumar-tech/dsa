require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDatabase, databaseConfigured } = require('./config/db');
const { assertSupabaseConfigured, supabaseConfigured } = require('./config/supabase');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const cohortRoutes = require('./routes/cohorts');
const showroomRoutes = require('./routes/showrooms');
const offerRoutes = require('./routes/offers');
const vehicleRoutes = require('./routes/vehicles');
const { requireAuth } = require('./middleware/auth');
const { generateNegotiationStrategy } = require('./services/ai');
const { aiRequestSchema } = require('./schemas');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = new Set(
  [
    'http://localhost:5173',
    'http://localhost:4173',
    ...(process.env.FRONTEND_URLS || '').split(','),
  ]
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/+$/, ''))) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS.'));
    },
  }),
);
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: databaseConfigured ? 'supabase-postgres' : 'in-memory-development',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/showrooms', showroomRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/vehicles', vehicleRoutes);

const strategyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many strategy requests. Please try again shortly.' },
});

app.post('/api/ai/negotiation-strategy', requireAuth, strategyLimiter, async (req, res) => {
  try {
    const payload = aiRequestSchema.parse(req.body);

    const strategy = await generateNegotiationStrategy(payload);
    return res.status(200).json(strategy);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: error.issues[0].message } });
    }

    console.error('Unable to generate negotiation strategy.');
    return res.status(500).json({ error: { code: 'AI_STRATEGY_FAILED', message: 'Unable to generate negotiation strategy.' } });
  }
});

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const isJsonError = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const status = isJsonError ? 400 : 500;
  const code = isJsonError ? 'INVALID_JSON' : 'INTERNAL_ERROR';
  const message = isJsonError ? 'Request body must contain valid JSON.' : 'The API could not complete this request.';
  if (status === 500) console.error('Unhandled API request error.');
  return res.status(status).json({ error: { code, message } });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production' && !databaseConfigured) {
    throw new Error('DATABASE_URL must be configured for production deployments.');
  }

  if (supabaseConfigured && !databaseConfigured) {
    throw new Error('DATABASE_URL is required when Supabase Auth is configured.');
  }

  if (databaseConfigured) {
    assertSupabaseConfigured();
  }
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`CarCollective API running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  if (
    error.message.startsWith('Supabase direct database host') ||
    error.message.startsWith('Cannot resolve PostgreSQL host') ||
    error.message.startsWith('The network cannot reach PostgreSQL host') ||
    error.message.startsWith('Cannot reach PostgreSQL host') ||
    error.message.startsWith('Supabase reached the database, but rejected the PostgreSQL login')
  ) {
    console.error(`Backend startup blocked: ${error.message}`);
    process.exit(1);
  }

  console.error('Failed to start the API server:', error);
  process.exit(1);
});
