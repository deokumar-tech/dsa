const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { cohortCreateSchema } = require('../schemas');
const { pool, databaseConfigured } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { getCohortsForSearch, createCohortRecord, joinCohortRecord, store } = require('../data/store');
const { cohorts: demoCohorts, offers: demoOffers } = require('../data/bhubaneswarDemo');
const { parseNearbyQuery, haversineDistanceKm } = require('../services/geo');
const { calculateGroupPrice, getGroupDiscountBasisPoints } = require('../services/pricing');

const router = express.Router();
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function validationError(res, error) {
  if (!(error instanceof z.ZodError)) return false;
  sendError(res, 400, 'INVALID_INPUT', error.issues[0]?.message || 'Check the submitted information.');
  return true;
}

function distanceSql(alias = 'c') {
  return `6371 * 2 * ASIN(SQRT(LEAST(1,
    POWER(SIN(RADIANS($1::double precision - ${alias}.lat::double precision) / 2), 2)
    + COS(RADIANS(${alias}.lat::double precision)) * COS(RADIANS($1::double precision))
    * POWER(SIN(RADIANS($2::double precision - ${alias}.lng::double precision) / 2), 2)
  )))`;
}

function isNearbySearch(query) {
  return query.lat !== undefined || query.lng !== undefined || query.radiusKm !== undefined || query.pincode !== undefined
    || query.zip === undefined && query.zipCode === undefined && query.make === undefined && query.model === undefined;
}

function memoryCohortResults(query) {
  const tierRows = [{ min_members: 5, extra_discount_pct: 1 }, { min_members: 10, extra_discount_pct: 2 }, { min_members: 20, extra_discount_pct: 3 }];
  return demoCohorts
    .filter((cohort) => cohort.city === 'Bhubaneswar')
    .filter((cohort) => !query.make || cohort.target_make.toLowerCase() === query.make.toLowerCase())
    .filter((cohort) => !query.model || cohort.target_model.toLowerCase() === query.model.toLowerCase())
    .map((cohort) => {
      const distanceKm = haversineDistanceKm(query.lat, query.lng, cohort.lat, cohort.lng);
      const closestOffer = demoOffers
        .filter((offer) => offer.vehicle_id === cohort.vehicle_id)
        .filter((offer) => haversineDistanceKm(query.lat, query.lng, offer.showroom.lat, offer.showroom.lng) <= query.radiusKm)
        .sort((left, right) => left.final_price_inr - right.final_price_inr)[0];
      return {
        ...cohort,
        distanceKm: Number(distanceKm.toFixed(2)),
        can_join: cohort.member_count < cohort.target_size,
        best_nearby_offer_price_inr: closestOffer?.final_price_inr ?? null,
        estimated_group_price_inr: closestOffer
          ? calculateGroupPrice(closestOffer.final_price_inr, cohort.member_count, tierRows)
          : null,
        group_discount_pct: getGroupDiscountBasisPoints(cohort.member_count, tierRows) / 100,
        best_nearby_showroom_name: closestOffer?.showroom.name ?? null,
        best_nearby_showroom_locality: closestOffer?.showroom.locality ?? null,
        best_nearby_showroom_distanceKm: closestOffer
          ? Number(haversineDistanceKm(query.lat, query.lng, closestOffer.showroom.lat, closestOffer.showroom.lng).toFixed(2))
          : null,
      };
    })
    .filter((cohort) => cohort.distanceKm <= query.radiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

async function getNearbyCohorts(query) {
  const values = [query.lat, query.lng, query.radiusKm, query.make || null, query.model || null];
  const result = await pool.query(
    `WITH cohort_counts AS (
       SELECT c.id, c.target_make, c.target_model, c.zip_code, c.status, c.max_members,
              c.urgency, c.created_by, c.seed_key, c.created_at, c.vehicle_id, c.showroom_id,
              c.city, c.locality, c.pincode, c.lat, c.lng,
              COALESCE(c.target_size, c.max_members) AS target_size, c.deadline,
              COUNT(cm.user_id)::int AS member_count,
              ROUND((${distanceSql()})::numeric, 2) AS "distanceKm"
       FROM cohorts c
       LEFT JOIN cohort_members cm ON cm.cohort_id = c.id
       WHERE c.city = 'Bhubaneswar'
         AND c.lat IS NOT NULL AND c.lng IS NOT NULL
         AND ${distanceSql()} <= $3
         AND ($4::text IS NULL OR lower(c.target_make) = lower($4))
         AND ($5::text IS NULL OR lower(c.target_model) = lower($5))
       GROUP BY c.id
     )
     SELECT c.*,
            best.final_price_inr AS best_nearby_offer_price_inr,
            CASE WHEN best.final_price_inr IS NULL THEN NULL
                 ELSE FLOOR(best.final_price_inr * (1 - COALESCE(tier.extra_discount_pct, 0) / 100))::bigint
            END AS estimated_group_price_inr,
            COALESCE(tier.extra_discount_pct, 0) AS group_discount_pct,
            tier.min_members AS group_discount_min_members,
            best.showroom_name AS best_nearby_showroom_name,
            best.locality AS best_nearby_showroom_locality,
            best."distanceKm" AS "best_nearby_showroom_distanceKm",
            (best.is_demo IS TRUE) AS is_demo,
            c.member_count < c.target_size AS can_join
     FROM cohort_counts c
     LEFT JOIN LATERAL (
       SELECT o.ex_showroom_price_inr - o.dealer_discount_inr AS final_price_inr,
              s.is_demo, s.name AS showroom_name, s.locality,
              ROUND((${distanceSql('s')})::numeric, 2) AS "distanceKm"
       FROM showroom_offers o
       JOIN showrooms s ON s.id = o.showroom_id
       WHERE o.vehicle_id = c.vehicle_id AND s.city = c.city
         AND s.lat IS NOT NULL AND s.lng IS NOT NULL
         AND ${distanceSql('s')} <= $3
       ORDER BY final_price_inr, s.name
       LIMIT 1
     ) best ON TRUE
     LEFT JOIN LATERAL (
       SELECT min_members, extra_discount_pct FROM group_discount_tiers
       WHERE min_members <= c.member_count
       ORDER BY min_members DESC
       LIMIT 1
     ) tier ON TRUE
     ORDER BY c."distanceKm", c.created_at DESC`,
    values,
  );
  return result.rows;
}

router.get('/', async (req, res) => {
  try {
    if (isNearbySearch(req.query)) {
      const query = parseNearbyQuery(req.query);
      if (!databaseConfigured) return res.json(memoryCohortResults(query));
      return res.json(await getNearbyCohorts(query));
    }

    const payload = cohortCreateSchema.partial().parse({
      target_make: req.query.make,
      target_model: req.query.model,
      zip_code: req.query.zip || req.query.zipCode,
    });
    if (databaseConfigured) {
      const where = [];
      const values = [];
      if (payload.target_make) {
        values.push(payload.target_make);
        where.push(`lower(c.target_make) = lower($${values.length})`);
      }
      if (payload.target_model) {
        values.push(payload.target_model);
        where.push(`lower(c.target_model) = lower($${values.length})`);
      }
      if (payload.zip_code) {
        values.push(payload.zip_code);
        where.push(payload.zip_code.length === 6
          ? `c.pincode = $${values.length}`
          : `LEFT(c.zip_code, 3) = LEFT($${values.length}::text, 3)`);
      }
      const result = await pool.query(
        `SELECT c.*, COALESCE(c.target_size, c.max_members) AS target_size,
                COUNT(cm.user_id)::int AS member_count
         FROM cohorts c LEFT JOIN cohort_members cm ON cm.cohort_id = c.id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         GROUP BY c.id ORDER BY c.created_at DESC`,
        values,
      );
      return res.json(result.rows.map((row) => ({ ...row, can_join: row.member_count < row.target_size })));
    }
    return res.json(getCohortsForSearch({
      make: payload.target_make,
      model: payload.target_model,
      zipCode: payload.zip_code,
    }));
  } catch (error) {
    if (validationError(res, error)) return;
    console.error('Unable to load cohorts:', error.code || error.name, error.message);
    return sendError(res, 500, 'COHORTS_UNAVAILABLE', 'Cohorts could not be loaded. Please retry.');
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!databaseConfigured) {
      const cohort = demoCohorts.find((item) => item.id === req.params.id);
      if (!cohort) return sendError(res, 404, 'COHORT_NOT_FOUND', 'Cohort not found.');
      const members = Array.from({ length: cohort.member_count }, (_, index) => ({
        id: `${cohort.id}-member-${index + 1}`,
        name: `Buyer ${String(index + 1).padStart(2, '0')}`,
        status: 'Joined',
      }));
      return res.json({
        ...cohort,
        members,
        updates: [
          { id: `${cohort.id}-created`, label: 'Cohort started', created_at: cohort.created_at },
          ...members.map((member) => ({ id: member.id, label: `${member.name} joined`, created_at: cohort.created_at })),
        ],
      });
    }
    const result = await pool.query(
      `SELECT c.*, COALESCE(c.target_size, c.max_members) AS target_size,
              COUNT(cm.user_id)::int AS member_count,
              ROUND((${distanceSql()})::numeric, 2) AS "distanceKm",
              best.final_price_inr AS best_nearby_offer_price_inr,
              best.showroom_name AS best_nearby_showroom_name,
              best.locality AS best_nearby_showroom_locality,
              best."distanceKm" AS "best_nearby_showroom_distanceKm",
              (best.is_demo IS TRUE) AS is_demo
       FROM cohorts c
       LEFT JOIN cohort_members cm ON cm.cohort_id = c.id
       LEFT JOIN LATERAL (
         SELECT o.ex_showroom_price_inr - o.dealer_discount_inr AS final_price_inr,
                s.is_demo, s.name AS showroom_name, s.locality,
                ROUND((${distanceSql('s')})::numeric, 2) AS "distanceKm"
         FROM showroom_offers o JOIN showrooms s ON s.id = o.showroom_id
         WHERE o.vehicle_id = c.vehicle_id AND s.city = c.city
           AND s.lat IS NOT NULL AND s.lng IS NOT NULL
           AND ${distanceSql('s')} <= $3
         ORDER BY final_price_inr, s.name LIMIT 1
       ) best ON TRUE
       WHERE c.id = $4
       GROUP BY c.id, best.final_price_inr, best.is_demo, best.showroom_name,
                best.locality, best."distanceKm"`,
      [20.2961, 85.8245, 100, req.params.id],
    );
    const cohort = result.rows[0];
    if (!cohort) return sendError(res, 404, 'COHORT_NOT_FOUND', 'Cohort not found.');
    const tierResult = await pool.query(
      'SELECT min_members, extra_discount_pct FROM group_discount_tiers ORDER BY min_members',
    );
    cohort.estimated_group_price_inr = cohort.best_nearby_offer_price_inr === null
      ? null
      : calculateGroupPrice(cohort.best_nearby_offer_price_inr, cohort.member_count, tierResult.rows);
    cohort.group_discount_pct = getGroupDiscountBasisPoints(cohort.member_count, tierResult.rows) / 100;
    cohort.group_discount_min_members = tierResult.rows
      .filter((tier) => Number(tier.min_members) <= cohort.member_count)
      .sort((left, right) => Number(right.min_members) - Number(left.min_members))[0]?.min_members ?? null;
    const memberResult = await pool.query(
      `SELECT 'Buyer ' || LPAD(ROW_NUMBER() OVER (ORDER BY joined_at, user_id)::text, 2, '0') AS name,
              'Joined' AS status, joined_at
       FROM cohort_members WHERE cohort_id = $1 ORDER BY joined_at, user_id`,
      [req.params.id],
    );
    const updates = [
      { id: `${cohort.id}-created`, label: 'Cohort started', created_at: cohort.created_at },
      ...memberResult.rows.map((member, index) => ({
        id: `${cohort.id}-member-${index + 1}`,
        label: `${member.name} joined`,
        created_at: member.joined_at,
      })),
    ];
    return res.json({ ...cohort, can_join: cohort.member_count < cohort.target_size, members: memberResult.rows, updates });
  } catch (error) {
    if (error.code === '22P02') return sendError(res, 404, 'COHORT_NOT_FOUND', 'Cohort not found.');
    console.error('Unable to load cohort details:', error.code || error.name, error.message);
    return sendError(res, 500, 'COHORT_UNAVAILABLE', 'Cohort details could not be loaded.');
  }
});

router.post('/', requireAuth, writeLimiter, async (req, res) => {
  try {
    const payload = cohortCreateSchema.parse(req.body);
    const pincode = payload.pincode || (payload.zip_code.length === 6 ? payload.zip_code : null);
    const targetSize = payload.target_size || payload.max_members;

    if (databaseConfigured) {
      const vehicle = payload.vehicle_id
        ? { rows: [{ id: payload.vehicle_id }] }
        : await pool.query(
          'SELECT id FROM vehicles WHERE lower(make) = lower($1) AND lower(model) = lower($2) ORDER BY variant LIMIT 1',
          [payload.target_make, payload.target_model],
        );
      const vehicleId = vehicle.rows[0]?.id || null;
      if (!vehicleId) return sendError(res, 400, 'VEHICLE_NOT_FOUND', 'Choose a vehicle available in the vehicle list.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query(
          `INSERT INTO cohorts
             (target_make, target_model, zip_code, status, max_members, urgency, created_by,
              vehicle_id, showroom_id, city, locality, pincode, lat, lng, target_size, deadline)
           VALUES ($1, $2, $3, 'forming', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $4, $14)
           RETURNING *`,
          [payload.target_make, payload.target_model, pincode || payload.zip_code, targetSize, payload.urgency,
            req.user.sub, vehicleId, payload.showroom_id || null, payload.city,
            payload.locality || null, pincode, payload.lat ?? 20.2961, payload.lng ?? 85.8245,
            payload.deadline || null],
        );
        const cohort = result.rows[0];
        await client.query('INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1, $2)', [cohort.id, req.user.sub]);
        await client.query('COMMIT');
        return res.status(201).json({ ...cohort, target_size: targetSize, member_count: 1, can_join: targetSize > 1 });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const cohort = createCohortRecord({
      target_make: payload.target_make,
      target_model: payload.target_model,
      zip_code: pincode || payload.zip_code,
      pincode,
      city: payload.city,
      locality: payload.locality,
      lat: payload.lat ?? 20.2961,
      lng: payload.lng ?? 85.8245,
      created_by: req.user.sub,
      max_members: targetSize,
      urgency: payload.urgency,
    });
    return res.status(201).json({ ...cohort, target_size: cohort.max_members, member_count: cohort.members.length, can_join: cohort.members.length < cohort.max_members });
  } catch (error) {
    if (validationError(res, error)) return;
    if (error.code === '23503') return sendError(res, 400, 'INVALID_REFERENCE', 'The selected vehicle or showroom is no longer available.');
    return sendError(res, 500, 'COHORT_CREATE_FAILED', 'Unable to create the cohort. Check the details and retry.');
  }
});

router.post('/:id/join', requireAuth, writeLimiter, async (req, res) => {
  try {
    if (databaseConfigured) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cohortResult = await client.query('SELECT * FROM cohorts WHERE id = $1 FOR UPDATE', [req.params.id]);
        const cohort = cohortResult.rows[0];
        if (!cohort) {
          await client.query('ROLLBACK');
          return sendError(res, 404, 'COHORT_NOT_FOUND', 'Cohort not found.');
        }
        const member = await client.query(
          'SELECT 1 FROM cohort_members WHERE cohort_id = $1 AND user_id = $2',
          [req.params.id, req.user.sub],
        );
        if (!member.rowCount) {
          const count = await client.query('SELECT COUNT(*)::int AS member_count FROM cohort_members WHERE cohort_id = $1', [req.params.id]);
          if (count.rows[0].member_count >= (cohort.target_size || cohort.max_members)) {
            await client.query('ROLLBACK');
            return sendError(res, 409, 'COHORT_FULL', 'This cohort is already full.');
          }
          await client.query('INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1, $2)', [req.params.id, req.user.sub]);
        }
        const count = await client.query('SELECT COUNT(*)::int AS member_count FROM cohort_members WHERE cohort_id = $1', [req.params.id]);
        await client.query('COMMIT');
        const targetSize = cohort.target_size || cohort.max_members;
        return res.json({ ...cohort, target_size: targetSize, member_count: count.rows[0].member_count, can_join: count.rows[0].member_count < targetSize });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const cohort = joinCohortRecord({ cohortId: req.params.id, userId: req.user.sub });
    if (!cohort) return sendError(res, 404, 'COHORT_NOT_FOUND', 'Cohort not found.');
    return res.json({ ...cohort, target_size: cohort.max_members, member_count: cohort.members.length, can_join: cohort.members.length < cohort.max_members });
  } catch (error) {
    if (error.code === '22P02') return sendError(res, 400, 'INVALID_ID', 'Cohort ID is invalid.');
    if (error.message === 'This cohort is already full.') return sendError(res, 409, 'COHORT_FULL', error.message);
    return sendError(res, 500, 'COHORT_JOIN_FAILED', 'Unable to join this cohort. Please retry.');
  }
});

module.exports = router;
