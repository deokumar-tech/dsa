const express = require('express');
const { cohortCreateSchema } = require('../schemas');
const { pool, databaseConfigured } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { getCohortsForSearch, createCohortRecord, joinCohortRecord } = require('../data/store');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const payload = cohortCreateSchema.partial().parse({
      target_make: req.query.make,
      target_model: req.query.model,
      zip_code: req.query.zip || req.query.zipCode,
    });

    if (databaseConfigured) {
      const where = [];
      const values = [];
      let index = 1;

      if (payload.target_make) {
        where.push(`lower(c.target_make) = lower($${index})`);
        values.push(payload.target_make);
        index += 1;
      }

      if (payload.target_model) {
        where.push(`lower(c.target_model) = lower($${index})`);
        values.push(payload.target_model);
        index += 1;
      }

      if (payload.zip_code) {
        where.push(`LEFT(c.zip_code, 3) = LEFT($${index}::text, 3)`);
        values.push(payload.zip_code);
      }

      const query = `
        SELECT
          c.id,
          c.target_make,
          c.target_model,
          c.zip_code,
          c.status,
          c.max_members,
          c.urgency,
          c.created_at,
          COUNT(cm.user_id)::int AS member_count
        FROM cohorts c
        LEFT JOIN cohort_members cm ON cm.cohort_id = c.id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
      const result = await pool.query(query, values);

      return res.json(
        result.rows.map((row) => ({
          ...row,
          can_join: row.member_count < row.max_members,
        })),
      );
    }

    return res.json(
      getCohortsForSearch({
        make: payload.target_make,
        model: payload.target_model,
        zipCode: payload.zip_code,
      }),
    );
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0].message });
    }

    return res.status(500).json({ message: 'Unable to fetch cohorts.', details: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const payload = cohortCreateSchema.parse(req.body);

    if (databaseConfigured) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query(
          `INSERT INTO cohorts (target_make, target_model, zip_code, status, max_members, urgency, created_by)
           VALUES ($1, $2, $3, 'forming', $4, $5, $6)
           RETURNING *`,
          [
            payload.target_make,
            payload.target_model,
            payload.zip_code,
            payload.max_members,
            payload.urgency,
            req.user.sub,
          ],
        );
        const cohort = result.rows[0];
        await client.query(
          'INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1, $2)',
          [cohort.id, req.user.sub],
        );
        await client.query('COMMIT');

        return res.status(201).json({
          ...cohort,
          member_count: 1,
          can_join: payload.max_members > 1,
        });
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
      zip_code: payload.zip_code,
      created_by: req.user.sub,
      max_members: payload.max_members,
      urgency: payload.urgency,
    });

    return res.status(201).json({
      ...cohort,
      member_count: cohort.members.length,
      can_join: cohort.members.length < cohort.max_members,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.issues[0].message });
    }

    return res.status(500).json({ message: 'Unable to create cohort.', details: error.message });
  }
});

router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const cohortId = req.params.id;

    if (databaseConfigured) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cohortResult = await client.query(
          'SELECT * FROM cohorts WHERE id = $1 FOR UPDATE',
          [cohortId],
        );
        const cohort = cohortResult.rows[0];
        if (!cohort) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Cohort not found.' });
        }

        const memberResult = await client.query(
          'SELECT 1 FROM cohort_members WHERE cohort_id = $1 AND user_id = $2',
          [cohortId, req.user.sub],
        );
        if (memberResult.rowCount === 0) {
          const countResult = await client.query(
            'SELECT COUNT(*)::int AS member_count FROM cohort_members WHERE cohort_id = $1',
            [cohortId],
          );
          if (countResult.rows[0].member_count >= cohort.max_members) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'This cohort is already full.' });
          }

          await client.query(
            'INSERT INTO cohort_members (cohort_id, user_id) VALUES ($1, $2)',
            [cohortId, req.user.sub],
          );
        }

        const countResult = await client.query(
          'SELECT COUNT(*)::int AS member_count FROM cohort_members WHERE cohort_id = $1',
          [cohortId],
        );
        await client.query('COMMIT');
        return res.status(200).json({
          ...cohort,
          member_count: countResult.rows[0].member_count,
          can_join: countResult.rows[0].member_count < cohort.max_members,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const cohort = joinCohortRecord({ cohortId, userId: req.user.sub });
    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found.' });
    }

    return res.status(200).json({
      ...cohort,
      member_count: cohort.members.length,
      can_join: cohort.members.length < cohort.max_members,
    });
  } catch (error) {
    if (error.code === '22P02') {
      return res.status(400).json({ message: 'Invalid cohort ID.' });
    }

    return res.status(500).json({ message: 'Unable to join cohort.', details: error.message });
  }
});

module.exports = router;
