require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { initDatabase, databaseConfigured } = require('./config/db');
const { assertSupabaseConfigured, supabaseConfigured } = require('./config/supabase');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const cohortRoutes = require('./routes/cohorts');
const { requireAuth } = require('./middleware/auth');
const { generateNegotiationStrategy } = require('./services/ai');

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
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: databaseConfigured ? 'supabase-postgres' : 'in-memory-development',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cohorts', cohortRoutes);

const strategyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many strategy requests. Please try again shortly.' },
});

app.post('/api/ai/negotiation-strategy', requireAuth, strategyLimiter, async (req, res) => {
  try {
    const payload = z
      .object({
        group_size: z.number().int().min(1),
        zip_code: z.string().trim().regex(/^\d{5}$/),
        year: z.number().int().min(1900).max(2100),
        make: z.string().trim().min(1),
        model: z.string().trim().min(1),
        listed_price: z.number().min(0),
        msrp: z.number().min(0),
      })
      .parse(req.body);

    const strategy = await generateNegotiationStrategy(payload);
    return res.status(200).json(strategy);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0].message });
    }

    return res.status(500).json({
      message: 'Unable to generate negotiation strategy.',
      details: error.message,
    });
  }
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
