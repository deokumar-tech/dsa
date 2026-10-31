require('dotenv').config();

const { initDatabase, closeDatabase } = require('../config/db');

initDatabase({ required: true })
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error('Database initialization failed:', error);
    await closeDatabase();
    process.exitCode = 1;
  });
