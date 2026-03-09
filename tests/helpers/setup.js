import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';
import { loadFixtures, createMockQuery } from './mockPool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-not-for-production';

function createMockClient(mockQuery) {
    return {
        query: mockQuery,
        release: () => {}
    };
}

export async function setup() {
    // Load fixture data into in-memory mock tables
    loadFixtures();
    // Replace pool.query and pool.connect with mock implementations
    const mockQuery = createMockQuery();
    pool.query = mockQuery;
    pool.connect = async () => createMockClient(mockQuery);
}

export async function teardown() {
    // Reset fixtures for clean state
    loadFixtures();
    const mockQuery = createMockQuery();
    pool.query = mockQuery;
    pool.connect = async () => createMockClient(mockQuery);
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
