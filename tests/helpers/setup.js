import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const DATA_DIR = path.join(process.cwd(), 'data');
const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');
const BACKUP_DIR = path.join(process.cwd(), 'tests', '_backup');
const LOCK_FILE = path.join(BACKUP_DIR, '.lock');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const DATA_FILES = [
    'admins.json', 'pdpa.json', 'theme.json',
    'cancer_types.csv', 'question_bank.csv', 'assignments.csv',
    'assessments-snapshot.json',
    'ui_translations.json', 'recommendations.json'
];

export async function setup() {
    // Only back up real data if no backup exists yet.
    // Since node --test runs each file in a child process, the first
    // process creates the backup; subsequent processes see it exists and skip.
    const lockExists = fs.existsSync(LOCK_FILE);
    if (!lockExists) {
        await fsp.mkdir(BACKUP_DIR, { recursive: true });
        for (const f of DATA_FILES) {
            const src = path.join(DATA_DIR, f);
            try { await fsp.copyFile(src, path.join(BACKUP_DIR, f)); } catch {}
        }
        // Write lock so other child processes don't re-backup
        await fsp.writeFile(LOCK_FILE, String(Date.now()), 'utf8');
    }
    // Copy fixtures into data/ for a clean test slate
    for (const f of DATA_FILES) {
        const fix = path.join(FIXTURES_DIR, f);
        try { await fsp.copyFile(fix, path.join(DATA_DIR, f)); } catch {}
    }
}

export async function teardown() {
    // Restore original data files from backup
    for (const f of DATA_FILES) {
        const bak = path.join(BACKUP_DIR, f);
        try { await fsp.copyFile(bak, path.join(DATA_DIR, f)); } catch {}
    }
}

// Safety net: synchronously restore on process exit
process.on('exit', () => {
    for (const f of DATA_FILES) {
        const bak = path.join(BACKUP_DIR, f);
        const dst = path.join(DATA_DIR, f);
        try { fs.copyFileSync(bak, dst); } catch {}
    }
    // Clean up backup dir (last process to exit wins)
    try { fs.rmSync(BACKUP_DIR, { recursive: true, force: true }); } catch {}
});

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
