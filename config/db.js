import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    }
    release();
    console.log('✓ Database connected successfully');
});

export default pool;