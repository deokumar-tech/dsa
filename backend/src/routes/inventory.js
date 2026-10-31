const express = require('express');
const { inventorySearchSchema } = require('../schemas');
const { pool, databaseConfigured } = require('../config/db');
const { getInventoryResults } = require('../data/store');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const payload = inventorySearchSchema.parse({
      make: req.query.make,
      model: req.query.model,
      zipCode: req.query.zip || req.query.zipCode,
    });

    if (databaseConfigured) {
      const result = await pool.query(
        `SELECT i.*, d.name AS dealership_name, d.address AS dealership_address, d.zip_code AS dealership_zip
         FROM inventory i
         JOIN dealerships d ON d.id = i.dealership_id
         WHERE i.make = $1 AND i.model = $2
           AND ($3::text IS NULL OR LEFT(d.zip_code, 3) = LEFT($3, 3))
         ORDER BY i.listed_price ASC`,
        [payload.make, payload.model, payload.zipCode || null],
      );

      return res.json(
        result.rows.map((row) => ({
          id: row.id,
          make: row.make,
          model: row.model,
          year: row.year,
          trim: row.trim,
          listed_price: Number(row.listed_price),
          msrp: Number(row.msrp),
          delta: Number(row.listed_price) - Number(row.msrp),
          dealership: {
            name: row.dealership_name,
            address: row.dealership_address,
            zip_code: row.dealership_zip,
          },
        })),
      );
    }

    return res.json(getInventoryResults(payload));
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0].message });
    }

    return res.status(500).json({ message: 'Unable to fetch inventory.', details: error.message });
  }
});

module.exports = router;
