const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { pool, databaseConfigured } = require('../config/db');
const { supabaseAdmin, supabaseConfigured } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { showroomCreateSchema, offerCreateSchema } = require('../schemas');
const { offers: demoOffers, showrooms: demoShowrooms } = require('../data/bhubaneswarDemo');
const { parseNearbyQuery, haversineDistanceKm } = require('../services/geo');

const router = express.Router();
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many changes. Please try again shortly.' } },
});
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Upload a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
});

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function handleValidationError(res, error) {
  if (error instanceof z.ZodError) {
    sendError(res, 400, 'INVALID_INPUT', error.issues[0]?.message || 'Check the submitted information.');
    return true;
  }
  return false;
}

function publicPhotoUrl(photoPath) {
  if (!photoPath || !supabaseAdmin) return null;
  return supabaseAdmin.storage.from('showroom-photos').getPublicUrl(photoPath).data.publicUrl;
}

function distanceSql(tableAlias = 's') {
  return `6371 * 2 * ASIN(SQRT(LEAST(1,
    POWER(SIN(RADIANS($1::double precision - ${tableAlias}.lat::double precision) / 2), 2)
    + COS(RADIANS(${tableAlias}.lat::double precision)) * COS(RADIANS($1::double precision))
    * POWER(SIN(RADIANS($2::double precision - ${tableAlias}.lng::double precision) / 2), 2)
  )))`;
}

function decorateDemoShowroom(showroom, location) {
  const distanceKm = haversineDistanceKm(location.lat, location.lng, showroom.lat, showroom.lng);
  return {
    ...showroom,
    distanceKm: Number(distanceKm.toFixed(2)),
    photoUrl: null,
  };
}

function validateImage(file) {
  const signatures = {
    'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    'image/png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/webp': (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
  };
  return Boolean(file && signatures[file.mimetype]?.(file.buffer));
}

function parseUpload(req, res, next) {
  photoUpload.single('photo')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 413, 'FILE_TOO_LARGE', 'Photo must be 2 MB or smaller.');
    }
    return sendError(res, 400, 'INVALID_PHOTO', error.message || 'The photo could not be uploaded.');
  });
}

router.get('/', async (req, res) => {
  try {
    const query = parseNearbyQuery(req.query);
    if (!databaseConfigured) {
      const showrooms = demoShowrooms
        .map((showroom) => decorateDemoShowroom(showroom, query))
        .filter((showroom) => showroom.distanceKm <= query.radiusKm)
        .filter((showroom) => demoOffers.some((offer) => offer.showroom_id === showroom.id && matchesVehicle(offer, query)));
      return res.json(showrooms);
    }

    const values = [query.lat, query.lng, query.radiusKm];
    const filters = [`s.city = 'Bhubaneswar'`, `${distanceSql()} <= $3`];
    if (query.make || query.model) {
      values.push(query.make || null, query.model || null);
      filters.push(`EXISTS (
        SELECT 1 FROM showroom_offers o JOIN vehicles v ON v.id = o.vehicle_id
        WHERE o.showroom_id = s.id
          AND ($4::text IS NULL OR lower(v.make) = lower($4))
          AND ($5::text IS NULL OR lower(v.model) = lower($5))
      )`);
    }
    const result = await pool.query(
      `SELECT s.id, s.name, s.brand, s.address, s.locality, s.city, s.state, s.pincode,
              s.lat, s.lng, s.phone, s.hours, s.photo_path, s.verified, s.is_demo,
              s.created_at, s.updated_at, ROUND((${distanceSql()})::numeric, 2) AS "distanceKm"
       FROM showrooms s
       WHERE ${filters.join(' AND ')}
       ORDER BY "distanceKm", s.name`,
      values,
    );
    return res.json(result.rows.map((row) => ({ ...row, photoUrl: publicPhotoUrl(row.photo_path) })));
  } catch (error) {
    if (handleValidationError(res, error)) return;
    return sendError(res, 500, 'SHOWROOMS_UNAVAILABLE', 'Showrooms could not be loaded. Please retry.');
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    if (!databaseConfigured) return res.json([]);
    const result = await pool.query(
      `SELECT id, name, brand, address, locality, city, state, pincode,
              lat, lng, phone, hours, photo_path, verified, is_demo, created_at, updated_at
       FROM showrooms WHERE created_by = $1 ORDER BY created_at DESC`,
      [req.user.sub],
    );
    return res.json(result.rows.map((row) => ({ ...row, photoUrl: publicPhotoUrl(row.photo_path) })));
  } catch {
    return sendError(res, 500, 'SHOWROOMS_UNAVAILABLE', 'Your showrooms could not be loaded.');
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!databaseConfigured) {
      const showroom = demoShowrooms.find((item) => item.id === req.params.id);
      if (!showroom) return sendError(res, 404, 'SHOWROOM_NOT_FOUND', 'Showroom not found.');
      return res.json({
        ...showroom,
        photoUrl: null,
        offers: demoOffers.filter((offer) => offer.showroom_id === showroom.id),
      });
    }
    const [showroomResult, offersResult] = await Promise.all([
      pool.query(
        `SELECT s.id, s.name, s.brand, s.address, s.locality, s.city, s.state, s.pincode,
                s.lat, s.lng, s.phone, s.hours, s.photo_path, s.verified, s.is_demo,
                s.created_at, s.updated_at, NULL::numeric AS "distanceKm"
         FROM showrooms s WHERE s.id = $1`,
        [req.params.id],
      ),
      pool.query(
        `SELECT o.id, o.showroom_id, o.vehicle_id, o.ex_showroom_price_inr,
                o.dealer_discount_inr, o.ex_showroom_price_inr - o.dealer_discount_inr AS final_price_inr,
                o.stock, o.offer_note, o.valid_until, o.price_updated_at, o.photo_path,
                v.make, v.model, v.variant, v.fuel, v.body_type, v.seating, s.is_demo
         FROM showroom_offers o JOIN vehicles v ON v.id = o.vehicle_id
         JOIN showrooms s ON s.id = o.showroom_id
         WHERE o.showroom_id = $1 ORDER BY v.make, v.model, v.variant`,
        [req.params.id],
      ),
    ]);
    const showroom = showroomResult.rows[0];
    if (!showroom) return sendError(res, 404, 'SHOWROOM_NOT_FOUND', 'Showroom not found.');
    return res.json({
      ...showroom,
      photoUrl: publicPhotoUrl(showroom.photo_path),
      offers: offersResult.rows.map((offer) => ({ ...offer, photoUrl: publicPhotoUrl(offer.photo_path) })),
    });
  } catch (error) {
    if (error.code === '22P02') return sendError(res, 400, 'INVALID_ID', 'Showroom ID is invalid.');
    return sendError(res, 500, 'SHOWROOM_UNAVAILABLE', 'Showroom details could not be loaded.');
  }
});

router.post('/', requireAuth, writeLimiter, async (req, res) => {
  try {
    const payload = showroomCreateSchema.parse(req.body);
    if (!databaseConfigured) return sendError(res, 503, 'DATABASE_REQUIRED', 'Connect the database before adding a showroom.');
    const result = await pool.query(
      `INSERT INTO showrooms
         (name, brand, address, locality, city, state, pincode, lat, lng, phone, hours, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), NULLIF($11, ''), $12)
       RETURNING *`,
      [payload.name, payload.brand || null, payload.address, payload.locality, payload.city, payload.state,
        payload.pincode, payload.lat, payload.lng, payload.phone || '', payload.hours || '', req.user.sub],
    );
    const showroom = result.rows[0];
    return res.status(201).json({ ...showroom, photoUrl: publicPhotoUrl(showroom.photo_path) });
  } catch (error) {
    if (handleValidationError(res, error)) return;
    return sendError(res, 500, 'SHOWROOM_CREATE_FAILED', 'The showroom could not be saved. Check the details and retry.');
  }
});

router.post('/:id/offers', requireAuth, writeLimiter, async (req, res) => {
  try {
    const payload = offerCreateSchema.parse(req.body);
    if (!databaseConfigured) return sendError(res, 503, 'DATABASE_REQUIRED', 'Connect the database before adding an offer.');
    const owner = await pool.query('SELECT id FROM showrooms WHERE id = $1 AND created_by = $2', [req.params.id, req.user.sub]);
    if (!owner.rowCount) return sendError(res, 404, 'SHOWROOM_NOT_FOUND', 'You can only add prices to a showroom you created.');
    const result = await pool.query(
      `INSERT INTO showroom_offers
         (showroom_id, vehicle_id, ex_showroom_price_inr, dealer_discount_inr, stock, offer_note, valid_until, price_updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (showroom_id, vehicle_id) DO UPDATE SET
         ex_showroom_price_inr = EXCLUDED.ex_showroom_price_inr,
         dealer_discount_inr = EXCLUDED.dealer_discount_inr,
         stock = EXCLUDED.stock,
         offer_note = EXCLUDED.offer_note,
         valid_until = EXCLUDED.valid_until,
         price_updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.params.id, payload.vehicle_id, payload.ex_showroom_price_inr, payload.dealer_discount_inr,
        payload.stock ?? null, payload.offer_note || null, payload.valid_until || null],
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (handleValidationError(res, error)) return;
    if (error.code === '23503') return sendError(res, 400, 'INVALID_VEHICLE', 'Choose a vehicle from the vehicle list.');
    return sendError(res, 500, 'OFFER_SAVE_FAILED', 'The price could not be saved. Check the values and retry.');
  }
});

router.post('/:id/photo', requireAuth, writeLimiter, parseUpload, async (req, res) => {
  if (!databaseConfigured || !supabaseConfigured) {
    return sendError(res, 503, 'STORAGE_UNAVAILABLE', 'Photo upload requires the configured Supabase database and storage service.');
  }
  if (!req.file || !validateImage(req.file)) {
    return sendError(res, 400, 'INVALID_PHOTO', 'The photo content must be a valid JPEG, PNG, or WebP image.');
  }

  let owner;
  try {
    owner = await pool.query('SELECT id FROM showrooms WHERE id = $1 AND created_by = $2', [req.params.id, req.user.sub]);
  } catch {
    return sendError(res, 500, 'SHOWROOM_LOOKUP_FAILED', 'The showroom could not be verified for this upload.');
  }
  if (!owner.rowCount) return sendError(res, 404, 'SHOWROOM_NOT_FOUND', 'You can only upload photos for a showroom you created.');

  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[req.file.mimetype];
  const storagePath = `showrooms/${req.params.id}/${crypto.randomUUID()}.${extension}`;
  try {
    const { error: uploadError } = await supabaseAdmin.storage
      .from('showroom-photos')
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) return sendError(res, 502, 'PHOTO_STORAGE_FAILED', 'The photo could not be stored. Please retry.');
  } catch {
    return sendError(res, 502, 'PHOTO_STORAGE_FAILED', 'The photo could not be stored. Please retry.');
  }

  try {
    const result = await pool.query(
      `UPDATE showrooms SET photo_path = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND created_by = $3 RETURNING *`,
      [storagePath, req.params.id, req.user.sub],
    );
    return res.json({ ...result.rows[0], photoUrl: publicPhotoUrl(storagePath) });
  } catch (error) {
    const { error: cleanupError } = await supabaseAdmin.storage.from('showroom-photos').remove([storagePath]);
    if (cleanupError) console.error('Unable to remove an orphaned showroom photo from storage.');
    return sendError(res, 500, 'PHOTO_SAVE_FAILED', 'The photo was uploaded but could not be linked to the showroom.');
  }
});

module.exports = router;
module.exports.publicPhotoUrl = publicPhotoUrl;
