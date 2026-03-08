/**
 * Unit tests for admin asset staging utility (js/admin/assetStaging.js).
 * Pure logic — no DOM stubs needed, only URL.createObjectURL/revokeObjectURL mocks.
 * Run: NODE_ENV=test node --test tests/asset-staging.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// ---- Mock browser URL API ----
let blobUrlCounter = 0;
let revokedUrls = [];

globalThis.URL = globalThis.URL || {};
const _origCreate = globalThis.URL.createObjectURL;
const _origRevoke = globalThis.URL.revokeObjectURL;

globalThis.URL.createObjectURL = () => `blob:test-${++blobUrlCounter}`;
globalThis.URL.revokeObjectURL = (url) => { revokedUrls.push(url); };

// Fresh import each time to avoid stale module state
let importCtr = 0;
async function freshImport() {
    return import(`../public/js/admin/assetStaging.js?v=${++importCtr}`);
}

describe('createAssetStager', () => {
    let stager;

    beforeEach(async () => {
        blobUrlCounter = 0;
        revokedUrls = [];
        const mod = await freshImport();
        stager = mod.createAssetStager();
    });

    // ---- stageUpload ----

    describe('stageUpload', () => {
        it('returns a tempId starting with "pending-"', () => {
            const id = stager.stageUpload({ name: 'img.png' }, 'cancer-cards');
            assert.ok(id.startsWith('pending-'), `Expected tempId to start with "pending-", got "${id}"`);
        });

        it('stores the file and folder', () => {
            const file = { name: 'bg.jpg' };
            stager.stageUpload(file, 'backgrounds');
            const uploads = stager.getPendingUploads();
            assert.strictEqual(uploads.length, 1);
            assert.strictEqual(uploads[0].file, file);
            assert.strictEqual(uploads[0].folder, 'backgrounds');
        });

        it('creates a blobUrl via URL.createObjectURL', () => {
            const id = stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            const blobUrl = stager.getBlobUrl(id);
            assert.ok(blobUrl.startsWith('blob:'), `Expected blob URL, got "${blobUrl}"`);
        });

        it('returns unique tempIds for multiple uploads', () => {
            const id1 = stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            const id2 = stager.stageUpload({ name: 'b.png' }, 'backgrounds');
            const id3 = stager.stageUpload({ name: 'c.mp3' }, 'music');
            assert.notStrictEqual(id1, id2);
            assert.notStrictEqual(id2, id3);
            assert.notStrictEqual(id1, id3);
        });

        it('getPendingUploads returns all staged files', () => {
            stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            stager.stageUpload({ name: 'b.png' }, 'backgrounds');
            assert.strictEqual(stager.getPendingUploads().length, 2);
        });
    });

    // ---- unstageUpload ----

    describe('unstageUpload', () => {
        it('removes a staged file by tempId', () => {
            const id = stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            stager.unstageUpload(id);
            assert.strictEqual(stager.getPendingUploads().length, 0);
        });

        it('revokes the blob URL', () => {
            const id = stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            const blobUrl = stager.getBlobUrl(id);
            stager.unstageUpload(id);
            assert.ok(revokedUrls.includes(blobUrl), 'Expected blob URL to be revoked');
        });

        it('is a no-op for unknown tempId', () => {
            stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            stager.unstageUpload('pending-unknown');
            assert.strictEqual(stager.getPendingUploads().length, 1);
        });
    });

    // ---- stageDelete ----

    describe('stageDelete', () => {
        it('adds path to pending deletes', () => {
            stager.stageDelete('assets/backgrounds/old.png');
            assert.deepStrictEqual(stager.getPendingDeletes(), ['assets/backgrounds/old.png']);
        });

        it('deduplicates the same path', () => {
            stager.stageDelete('assets/backgrounds/old.png');
            stager.stageDelete('assets/backgrounds/old.png');
            assert.strictEqual(stager.getPendingDeletes().length, 1);
        });

        it('getPendingDeletes returns all staged paths', () => {
            stager.stageDelete('assets/backgrounds/a.png');
            stager.stageDelete('assets/backgrounds/b.png');
            assert.strictEqual(stager.getPendingDeletes().length, 2);
        });
    });

    // ---- unstageDelete ----

    describe('unstageDelete', () => {
        it('removes a path from pending deletes', () => {
            stager.stageDelete('assets/backgrounds/old.png');
            stager.unstageDelete('assets/backgrounds/old.png');
            assert.strictEqual(stager.getPendingDeletes().length, 0);
        });

        it('is a no-op for unknown path', () => {
            stager.stageDelete('assets/backgrounds/old.png');
            stager.unstageDelete('assets/backgrounds/unknown.png');
            assert.strictEqual(stager.getPendingDeletes().length, 1);
        });
    });

    // ---- isPending ----

    describe('isPending', () => {
        it('returns true for staged tempIds', () => {
            const id = stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            assert.strictEqual(stager.isPending(id), true);
        });

        it('returns false for server paths', () => {
            assert.strictEqual(stager.isPending('assets/backgrounds/bg.png'), false);
        });

        it('returns false after unstaging', () => {
            const id = stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            stager.unstageUpload(id);
            assert.strictEqual(stager.isPending(id), false);
        });
    });

    // ---- cross-interaction: upload then delete before save ----

    describe('cross-interaction', () => {
        it('stageDelete of a pending tempId removes from uploads instead of adding to deletes', () => {
            const id = stager.stageUpload({ name: 'new.png' }, 'cancer-cards');
            stager.stageDelete(id);
            assert.strictEqual(stager.getPendingUploads().length, 0, 'Upload should be removed');
            assert.strictEqual(stager.getPendingDeletes().length, 0, 'Should not add to deletes');
        });

        it('stageDelete of a pending tempId revokes its blob URL', () => {
            const id = stager.stageUpload({ name: 'new.png' }, 'cancer-cards');
            const blobUrl = stager.getBlobUrl(id);
            stager.stageDelete(id);
            assert.ok(revokedUrls.includes(blobUrl), 'Blob URL should be revoked');
        });
    });

    // ---- reset ----

    describe('reset', () => {
        it('clears all pending uploads and deletes', () => {
            stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            stager.stageUpload({ name: 'b.png' }, 'backgrounds');
            stager.stageDelete('assets/mascots/old.png');
            stager.reset();
            assert.strictEqual(stager.getPendingUploads().length, 0);
            assert.strictEqual(stager.getPendingDeletes().length, 0);
        });

        it('revokes all blob URLs', () => {
            stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            stager.stageUpload({ name: 'b.png' }, 'backgrounds');
            stager.reset();
            assert.strictEqual(revokedUrls.length, 2);
        });
    });

    // ---- getBlobUrl ----

    describe('getBlobUrl', () => {
        it('returns the blob URL for a staged tempId', () => {
            const id = stager.stageUpload({ name: 'a.png' }, 'cancer-cards');
            const url = stager.getBlobUrl(id);
            assert.ok(url !== undefined);
            assert.ok(url.startsWith('blob:'));
        });

        it('returns undefined for unknown tempId', () => {
            assert.strictEqual(stager.getBlobUrl('pending-999'), undefined);
        });
    });
});
