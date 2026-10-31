const express = require('express');
const { pool, databaseConfigured } = require('../config/db');
const { offers: demoOffers } = require('../data/bhubaneswarDemo');
const { parseNearbyQuery, haversineDistanceKm } = require('../services/geo');
const { publicPhotoUrl } = require('./showrooms');

const router = express.Router();

function distanceSql(alias = 's') {
  return `6371 * 2 * ASIN(SQRT(LEAST(1,
    POWER(SIN(RADIANS($1::double precision - ${alias}.lat::double precision) / 2), 2)
    + COS(RADIANS(${alias}.lat::double precision)) * COS(RADIANS($1::double precision))
    * POWER(SIN(RADIANS($2::double precision - ${alias}.lng::double precision) / 2), 2)
  )))`;
}

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function matchesVehicle(offer, query) {
  return (!query.make || offer.make.toLowerCase() === query.make.toLowerCase())
    && (!query.model || offer.model.toLowerCase() === query.model.toLowerCase());
}

function formatDemoOffers(query) {
  const rows = demoOffers
    .filter((offer) => matchesVehicle(offer, query))
    .map((offer) => {
      const distanceKm = haversineDistanceKm(query.lat, query.lng, offer.showroom.lat, offer.showroom.lng);
      return {
        ...offer,
        distanceKm: Number(distanceKm.toFixed(2)),
        photoUrl: null,
        showroom: {
          ...offer.showroom,
          distanceKm: Number(distanceKm.toFixed(2)),
          photoUrl: null,
        },
      };
    })
    .filter((offer) => offer.distanceKm <= query.radiusKm);
  const bestDiscounts = new Map();
  rows.forEach((offer) => {
    bestDiscounts.set(offer.vehicle_id, Math.max(bestDiscounts.get(offer.vehicle_id) ?? -1, offer.dealer_discount_inr));
  });
  return rows.map((offer) => ({ ...offer, bestDeal: offer.dealer_discount_inr === bestDiscounts.get(offer.vehicle_id) }));
}

router.get('/', async (req, res) => {
  try {
    const query = parseNearbyQuery(req.query);
    if (!databaseConfigured) {
      const rows = formatDemoOffers(query);
      if (query.sort === 'lowest_price') rows.sort((a, b) => a.final_price_inr - b.final_price_inr);
      else if (query.sort === 'best_discount') rows.sort((a, b) => b.dealer_discount_inr - a.dealer_discount_inr);
      else rows.sort((a, b) => a.distanceKm - b.distanceKm);
      return res.json(rows);
    }

    const orderBy = {
      best_discount: 'dealer_discount_inr DESC, final_price_inr ASC',
      lowest_price: 'final_price_inr ASC, distanceKm ASC',
      nearest: 'distanceKm ASC, final_price_inr ASC',
    }[query.sort];
    const result = await pool.query(
      `WITH nearby_offers AS (
         SELECT o.id, o.showroom_id, o.vehicle_id, o.ex_showroom_price_inr, o.dealer_discount_inr,
                o.ex_showroom_price_inr - o.dealer_discount_inr AS final_price_inr,
                o.stock, o.offer_note, o.valid_until, o.price_updated_at, o.photo_path,
                v.make, v.model, v.variant, v.fuel, v.body_type, v.seating,
                s.name AS showroom_name, s.brand AS showroom_brand, s.address AS showroom_address,
                s.locality, s.city, s.state, s.pincode, s.lat AS showroom_lat, s.lng AS showroom_lng,
                s.phone, s.hours, s.verified, s.is_demo, s.photo_path AS showroom_photo_path,
                ROUND((${distanceSql()})::numeric, 2) AS "distanceKm"
         FROM showroom_offers o
         JOIN showrooms s ON s.id = o.showroom_id
         JOIN vehicles v ON v.id = o.vehicle_id
         WHERE s.city = 'Bhubaneswar'
           AND s.lat IS NOT NULL AND s.lng IS NOT NULL
           AND ${distanceSql()} <= $3
           AND ($4::text IS NULL OR lower(v.make) = lower($4))
           AND ($5::text IS NULL OR lower(v.model) = lower($5))
       ),
       ranked_offers AS (
         SELECT nearby_offers.*,
                ROW_NUMBER() OVER (
                  PARTITION BY vehicle_id ORDER BY dealer_discount_inr DESC, final_price_inr ASC
                ) = 1 AS "bestDeal"
         FROM nearby_offers
       )
       SELECT * FROM ranked_offers ORDER BY ${orderBy}`,
      [query.lat, query.lng, query.radiusKm, query.make || null, query.model || null],
    );
    return res.json(result.rows.map((row) => ({
      ...row,
      ex_showroom_price_inr: Number(row.ex_showroom_price_inr),
      dealer_discount_inr: Number(row.dealer_discount_inr),
      final_price_inr: Number(row.final_price_inr),
      distanceKm: Number(row.distanceKm),
      photoUrl: publicPhotoUrl(row.photo_path),
      showroom: {
        id: row.showroom_id,
        name: row.showroom_name,
        brand: row.showroom_brand,
        address: row.showroom_address,
        locality: row.locality,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        lat: Number(row.showroom_lat),
        lng: Number(row.showroom_lng),
        phone: row.phone,
        hours: row.hours,
        verified: row.verified,
        is_demo: row.is_demo,
        distanceKm: Number(row.distanceKm),
        photoUrl: publicPhotoUrl(row.showroom_photo_path),
      },
    })));
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, 400, 'INVALID_SEARCH', error.issues[0]?.message || 'Check your nearby search.');
    }
    return sendError(res, 500, 'OFFERS_UNAVAILABLE', 'Offers could not be loaded. Please retry.');
  }
});

module.exports = router;
