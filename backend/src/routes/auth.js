const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, databaseConfigured } = require('../config/db');
const { loginSchema, userAuthSchema } = require('../schemas');
const { requireAuth } = require('../middleware/auth');
const { createUserRecord, findUserByEmail, findUserById } = require('../data/store');
const { supabaseAnon, supabaseConfigured } = require('../config/supabase');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before the auth routes are loaded.');
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      zipCode: user.zip_code,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

async function registerUserWithDatabase(payload) {
  const normalizedEmail = payload.email.trim().toLowerCase();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    return { conflict: true };
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, zip_code)
     VALUES ($1, $2, $3)
     RETURNING id, email, zip_code, created_at`,
    [normalizedEmail, passwordHash, payload.zipCode],
  );

  return { user: result.rows[0] };
}

function registerUserMemory(payload) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    return { conflict: true };
  }

  return {
    user: createUserRecord({
      email: normalizedEmail,
      passwordHash: bcrypt.hashSync(payload.password, 12),
      zipCode: payload.zipCode,
    }),
  };
}

async function loginUserWithDatabase(payload) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  const user = result.rows[0];

  if (!user) {
    return { user: null };
  }

  const isValidPassword = await bcrypt.compare(payload.password, user.password_hash);
  return isValidPassword ? { user } : { user: null };
}

function loginUserMemory(payload) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const user = findUserByEmail(normalizedEmail);

  if (!user) {
    return { user: null };
  }

  const isValidPassword = bcrypt.compareSync(payload.password, user.password_hash);
  return isValidPassword ? { user } : { user: null };
}

router.post('/register', async (req, res) => {
  try {
    const payload = userAuthSchema.parse(req.body);

    if (supabaseConfigured) {
      const { data, error } = await supabaseAnon.auth.signUp({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: {
          data: { zip_code: payload.zipCode },
        },
      });

      if (error) {
        return res.status(error.status === 429 ? 429 : 400).json({
          message: error.message,
        });
      }

      if (!data.user) {
        return res.status(502).json({ message: 'Supabase did not return a user after registration.' });
      }

      if (data.user.identities?.length === 0) {
        return res.status(409).json({ message: 'An account with that email already exists.' });
      }

      if (!data.session?.access_token) {
        return res.status(202).json({
          confirmation_required: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            zipCode: payload.zipCode,
          },
        });
      }

      return res.status(201).json({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          zipCode: payload.zipCode,
        },
      });
    }

    if (databaseConfigured) {
      const result = await registerUserWithDatabase(payload);
      if (result.conflict) {
        return res.status(409).json({ message: 'An account with that email already exists.' });
      }

      const user = result.user;
      const token = createToken(user);

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          zipCode: user.zip_code,
          createdAt: user.created_at,
        },
      });
    }

    const result = registerUserMemory(payload);
    if (result.conflict) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const user = result.user;
    const token = createToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        zipCode: user.zip_code,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0].message });
    }
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    return res.status(500).json({ message: 'Unable to create account.', details: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body);

    if (supabaseConfigured) {
      const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });

      if (error || !data.session?.access_token || !data.user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const result = await pool.query(
        'SELECT id, email, zip_code, created_at FROM users WHERE id = $1',
        [data.user.id],
      );
      const profile = result.rows[0];

      return res.status(200).json({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          zipCode: profile?.zip_code || data.user.user_metadata?.zip_code || '',
          createdAt: profile?.created_at || data.user.created_at,
        },
      });
    }

    if (databaseConfigured) {
      const result = await loginUserWithDatabase(payload);
      if (!result.user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = createToken(result.user);
      return res.status(200).json({
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          zipCode: result.user.zip_code,
          createdAt: result.user.created_at,
        },
      });
    }

    const result = loginUserMemory(payload);
    if (!result.user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = createToken(result.user);
    return res.status(200).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        zipCode: result.user.zip_code,
        createdAt: result.user.created_at,
      },
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0].message });
    }

    return res.status(500).json({ message: 'Unable to log in.', details: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    if (databaseConfigured) {
      const result = await pool.query(
        'SELECT id, email, zip_code, created_at FROM users WHERE id = $1',
        [req.user.sub],
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.json({
        id: user.id,
        email: user.email,
        zipCode: user.zip_code,
        createdAt: user.created_at,
      });
    }

    const user = findUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      zipCode: user.zip_code,
      createdAt: user.created_at,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch profile.', details: error.message });
  }
});

module.exports = router;
