import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';
import { loadFixtures, createMockQuery } from './mockPool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-not-for-production';

export async function setup() {
    // Load fixture data into in-memory mock tables
    loadFixtures();
    // Replace pool.query with mock implementation
    pool.query = createMockQuery();
}

export async function teardown() {
    // Reset fixtures for clean state
    loadFixtures();
    pool.query = createMockQuery();
}

export function getSuperAdminToken() {
    return jwt.sign(
        { id: '0b2e5cb5-1d56-447d-88d4-d3647d5c96bd', email: 'admin@scs.com', role: 'super_admin' },
        JWT_SECRET
    );
}

export function getAdminToken() {
    return jwt.sign(
        { id: 'test-regular-admin', email: 'user@scs.com', role: 'admin' },
        JWT_SECRET
    );
}
