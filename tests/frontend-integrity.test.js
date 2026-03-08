/**
 * Frontend integrity tests
 * Verifies frontend JS files don't contain obvious errors that would
 * crash the app at runtime (undefined functions, broken imports, etc.)
 *
 * These tests catch "false positive" scenarios where backend tests pass
 * but the frontend is actually broken.
 *
 * Run: NODE_ENV=test node --test tests/frontend-integrity.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { app } from '../server.js';
import { setup, teardown } from './helpers/setup.js';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

describe('Frontend JS integrity', () => {
    before(async () => { await setup(); });
    after(async () => { await teardown(); });

    it('main.js should not call undefined functions', async () => {
        const content = await fs.readFile(path.join(PUBLIC_DIR, 'js', 'main.js'), 'utf8');

        // Check for bare function calls that aren't method calls or known helpers.
        // The pattern: a standalone identifier call like set(...) that isn't
        // preceded by a definition (const/let/var/function) or a dot (method call).
        // We specifically check for the known bug pattern: bare `set(` calls.
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip comments
            if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
            // Check for bare set() call — known past bug
            if (/^\s*set\s*\(/.test(lines[i]) && !lines[i].includes('setHtml') && !lines[i].includes('setAttribute') && !lines[i].includes('setTimeout') && !lines[i].includes('dataset')) {
                assert.fail(`main.js line ${i + 1}: bare set() call found — likely undefined function. Line: ${lines[i].trim()}`);
            }
        }
    });

    it('uiController.js import path should resolve to a served file', async () => {
        const content = await fs.readFile(path.join(PUBLIC_DIR, 'js', 'uiController.js'), 'utf8');
        // Extract the import path for riskCalculator
        const match = content.match(/from\s+['"]([^'"]*riskCalculator[^'"]*)['"]/);
        assert.ok(match, 'uiController.js must import riskCalculator');

        const importPath = match[1]; // e.g., '../controllers/riskCalculator.js'
        // Resolve relative to uiController.js location (public/js/)
        const resolved = path.resolve(PUBLIC_DIR, 'js', importPath);
        const exists = await fs.access(resolved).then(() => true).catch(() => false);
        assert.ok(exists, `Import path "${importPath}" resolves to ${resolved} which must exist on disk`);

        // Also verify it's served by Express
        const urlPath = '/' + path.relative(PUBLIC_DIR, resolved).replace(/\\/g, '/');
        const res = await request(app).get(urlPath);
        assert.strictEqual(res.status, 200, `${urlPath} must be served by Express`);
    });

    it('all ES module imports in main.js should resolve to served files', async () => {
        const content = await fs.readFile(path.join(PUBLIC_DIR, 'js', 'main.js'), 'utf8');
        const importRegex = /from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g;
        let match;
        const imports = [];
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        assert.ok(imports.length > 0, 'main.js should have ES module imports');

        for (const importPath of imports) {
            const resolved = path.resolve(PUBLIC_DIR, 'js', importPath);
            const exists = await fs.access(resolved).then(() => true).catch(() => false);
            assert.ok(exists, `Import "${importPath}" in main.js resolves to ${resolved} which must exist`);
        }
    });

    it('public/controllers/riskCalculator.js should be in sync with backend version', async () => {
        const backendPath = path.join(process.cwd(), 'controllers', 'riskCalculator.js');
        const frontendPath = path.join(PUBLIC_DIR, 'controllers', 'riskCalculator.js');

        const backend = await fs.readFile(backendPath, 'utf8');
        const frontend = await fs.readFile(frontendPath, 'utf8');

        // Extract exported function names from both versions
        const exportRegex = /export\s+function\s+(\w+)/g;
        const backendExports = new Set();
        const frontendExports = new Set();

        let m;
        while ((m = exportRegex.exec(backend)) !== null) backendExports.add(m[1]);
        exportRegex.lastIndex = 0;
        while ((m = exportRegex.exec(frontend)) !== null) frontendExports.add(m[1]);

        // Frontend must have all backend exports
        for (const fn of backendExports) {
            assert.ok(frontendExports.has(fn), `Frontend riskCalculator.js missing export: ${fn}`);
        }
    });
});
