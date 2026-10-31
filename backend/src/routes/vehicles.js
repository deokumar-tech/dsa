const express = require('express');
const { pool, databaseConfigured } = require('../config/db');
const { vehicles: demoVehicles } = require('../data/bhubaneswarDemo');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    if (!databaseConfigured) return res.json(demoVehicles);
    const result = await pool.query(
      'SELECT id, make, model, variant, fuel, body_type, seating FROM vehicles ORDER BY make, model, variant',
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: { code: 'VEHICLES_UNAVAILABLE', message: 'Vehicle choices could not be loaded.' } });
  }
});

module.exports = router;
