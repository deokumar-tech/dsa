const jwt = require('jsonwebtoken');
const { supabaseAdmin, supabaseConfigured } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before protected routes are loaded.');
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing authentication token.' });
  }

  if (supabaseConfigured) {
    supabaseAdmin.auth
      .getUser(token)
      .then(({ data, error }) => {
        if (error || !data.user) {
          return res.status(401).json({ message: 'Invalid or expired token.' });
        }

        req.user = {
          sub: data.user.id,
          email: data.user.email,
          zipCode: data.user.user_metadata?.zip_code,
        };
        return next();
      })
      .catch((error) => {
        console.error('Supabase token verification failed:', error);
        return res.status(503).json({ message: 'Unable to verify authentication right now.' });
      });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = { requireAuth };
