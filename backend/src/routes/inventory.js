const express = require('express');
const { z } = require('zod');
const { inventorySearchSchema } = require('../schemas');
const { pool, databaseConfigured } = require('../config/db');
const { offers: demoOffers } = require('../data/bhubaneswarDemo');
const { parseNearbyQuery, haversineDistanceKm } = require('../services/geo');

const router = express.Router();

function formatLegacyListing(offer) {
  const showroom = offer.showroom;
  return {
    id: offer.id,
    dealership_id: offer.showroom_id,
    make: offer.make,
    model: offer.model,
    trim: offer.variant,
    listed_price: Number(offer.ex_showroom_price_inr),
    msrp: Number(offer.ex_showroom_price_inr),
    delta: -Number(offer.dealer_discount_inr),
    dealer_discount_inr: Number(offer.dealer_discount_inr),
    final_price_inr: Number(offer.final_price_inr),
    distanceKm: offer.distanceKm,
    is_demo: offer.is_demo,
    dealership: showroom ? {
      name: showroom.name,
      address: showroom.address,
      zip_code: showroom.pincode,
      locality: showroom.locality,
      city: showroom.city,
      contact_email: null,
      contact_phone: showroom.phone,
    } : null,
  };
}

router.get('/', async (req, res) => {
  try {
    const payload = inventorySearchSchema.parse({
      make: req.query.make,
      model: req.query.model,
      zipCode: req.query.zip || req.query.zipCode,
    });
    const query = parseNearbyQuery({
      pincode: payload.zipCode?.length === 6 ? payload.zipCode : undefined,
      make: payload.make,
      model: payload.model,
      radiusKm: 25,
    });

    if (!databaseConfigured) {
      return res.json(
        demoOffers
          .filter((offer) => offer.make.toLowerCase() === payload.make.toLowerCase() && offer.model.toLowerCase() === payload.model.toLowerCase())
          .map((offer) => {
            const distanceKm = haversineDistanceKm(query.lat, query.lng, offer.showroom.lat, offer.showroom.lng);
            return formatLegacyListing({
              ...offer,
              distanceKm: Number(distanceKm.toFixed(2)),
              showroom: offer.showroom,
            });
          })
          .filter((offer) => offer.distanceKm <= query.radiusKm)
          .sort((left, right) => left.listed_price - right.listed_price),
      );
    }

    const result = await pool.query(
      `SELECT o.id, o.showroom_id, o.ex_showroom_price_inr, o.dealer_discount_inr,
              o.ex_showroom_price_inr - o.dealer_discount_inr AS final_price_inr,
              v.make, v.model, v.variant,
              s.name AS showroom_name, s.address AS showroom_address, s.pincode AS showroom_pincode,
              s.locality, s.city, s.phone, s.lat, s.lng, s.is_demo AS showroom_is_demo,
              ROUND((6371 * 2 * ASIN(SQRT(LEAST(1,
                POWER(SIN(RADIANS($1::double precision - s.lat::double precision) / 2), 2)
                + COS(RADIANS(s.lat::double precision)) * COS(RADIANS($1::double precision))
                * POWER(SIN(RADIANS($2::double precision - s.lng::double precision) / 2), 2)
              ))))::numeric, 2) AS "distanceKm"
       FROM showroom_offers o
       JOIN vehicles v ON v.id = o.vehicle_id
       JOIN showrooms s ON s.id = o.showroom_id
       WHERE s.city = 'Bhubaneswar'
         AND lower(v.make) = lower($4)
         AND lower(v.model) = lower($5)
         AND 6371 * 2 * ASIN(SQRT(LEAST(1,
           POWER(SIN(RADIANS($1::double precision - s.lat::double precision) / 2), 2)
           + COS(RADIANS(s.lat::double precision)) * COS(RADIANS($1::double precision))
           * POWER(SIN(RADIANS($2::double precision - s.lng::double precision) / 2), 2)
         ))) <= $3
       ORDER BY final_price_inr ASC`,
      [query.lat, query.lng, query.radiusKm, payload.make, payload.model],
    );

    return res.json(result.rows.map((row) => formatLegacyListing({
      id: row.id,
      showroom_id: row.showroom_id,
      make: row.make,
      model: row.model,
      variant: row.variant,
      ex_showroom_price_inr: row.ex_showroom_price_inr,
      dealer_discount_inr: row.dealer_discount_inr,
      final_price_inr: row.final_price_inr,
      distanceKm: Number(row.distanceKm),
      is_demo: row.showroom_is_demo,
      showroom: {
        name: row.showroom_name,
        address: row.showroom_address,
        pincode: row.showroom_pincode,
        locality: row.locality,
        city: row.city,
        phone: row.phone,
      },
    })));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Check the inventory search.' });
    }
    return res.status(500).json({ message: 'Unable to fetch inventory.', details: 'The inventory request failed.' });
  }
});

module.exports = router;
