const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function setup() {
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });

  try {
    const dbName = process.env.DB_NAME || 'vendorbridge';

    if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
      throw new Error('Invalid DB_NAME. Only letters, numbers and underscores are allowed.');
    }

    const res = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created`);
    } else {
      console.log(`ℹ️  Database "${dbName}" already exists`);
    }
    await adminPool.end();

    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: dbName,
    });

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema applied');

    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await pool.query(seed);
    console.log('✅ Seed data inserted');

    await pool.end();
    console.log('\n🎉 Database setup complete!');
    console.log('\nDemo credentials:');
    console.log('  Admin:               admin@vendorbridge.com / Password123!');
    console.log('  Procurement Officer: priya@vendorbridge.com / Password123!');
    console.log('  Manager:             rahul@vendorbridge.com / Password123!');
    console.log('  Vendor:              suresh@techsupplies.com / Password123!');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setup();
