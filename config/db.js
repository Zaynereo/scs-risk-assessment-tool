import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
    console.error('DATABASE_URL is missing');
}

const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })
    : { query: async () => ({ rows: [] }) };

export default pool;
