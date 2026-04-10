/**
 * Email service tests — mocks global.fetch to verify Resend API requests.
 * Run: NODE_ENV=test node --test tests/email-service.test.js
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import emailService from '../services/emailService.js';

describe('EmailService', () => {
    let originalFetch;
    let fetchCalls;

    before(() => {
        originalFetch = global.fetch;
    });

    after(() => {
        global.fetch = originalFetch;
    });

    beforeEach(() => {
        fetchCalls = [];
        process.env.EMAIL_PASSWORD = 'test-resend-api-key';
        process.env.EMAIL_FROM = 'Test <test@example.com>';
        process.env.APP_URL = 'https://example.test';
        global.fetch = async (url, opts) => {
            fetchCalls.push({ url, opts });
            return {
                ok: true,
                status: 200,
                json: async () => ({ id: 'mock-resend-id' })
            };
        };
    });

    describe('sendPasswordResetEmail', () => {
        it('POSTs to the Resend API endpoint', async () => {
            await emailService.sendPasswordResetEmail('user@example.com', 'raw-reset-token');
            assert.strictEqual(fetchCalls.length, 1);
            assert.strictEqual(fetchCalls[0].url, 'https://api.resend.com/emails');
            assert.strictEqual(fetchCalls[0].opts.method, 'POST');
        });

        it('passes the Resend API key as a Bearer header', async () => {
            await emailService.sendPasswordResetEmail('user@example.com', 'raw-reset-token');
            assert.strictEqual(
                fetchCalls[0].opts.headers.Authorization,
                'Bearer test-resend-api-key'
            );
        });

        it('addresses the email to the recipient', async () => {
            await emailService.sendPasswordResetEmail('user@example.com', 'raw-reset-token');
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.strictEqual(body.to, 'user@example.com');
        });

        it('embeds the reset token in the reset URL', async () => {
            await emailService.sendPasswordResetEmail('user@example.com', 'raw-reset-token');
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.ok(body.html.includes('https://example.test/resetPassword.html?token=raw-reset-token'),
                'html should contain tokened reset URL');
            assert.ok(body.text.includes('raw-reset-token'),
                'text fallback should contain token');
        });

        it('throws when the Resend API returns non-ok', async () => {
            global.fetch = async () => ({
                ok: false,
                status: 422,
                statusText: 'Unprocessable',
                json: async () => ({ message: 'invalid from address' })
            });
            await assert.rejects(
                () => emailService.sendPasswordResetEmail('user@example.com', 'tok'),
                /Failed to send email: invalid from address/
            );
        });
    });

    describe('sendNewAdminEmail', () => {
        it('sends login URL, email, and temp password in the body', async () => {
            await emailService.sendNewAdminEmail('new@example.com', {
                name: 'New Admin',
                tempPassword: 'Temp!Pass123'
            });
            assert.strictEqual(fetchCalls.length, 1);
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.strictEqual(body.to, 'new@example.com');
            assert.ok(body.html.includes('https://example.test/login.html'));
            assert.ok(body.html.includes('New Admin'));
            assert.ok(body.html.includes('Temp!Pass123'));
        });

        it('escapes HTML in name and tempPassword to prevent injection', async () => {
            await emailService.sendNewAdminEmail('xss@example.com', {
                name: '<script>alert(1)</script>',
                tempPassword: 'A"B<C'
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.ok(!body.html.includes('<script>alert(1)</script>'),
                'raw script tag must not appear in html');
            assert.ok(body.html.includes('&lt;script&gt;'),
                'script tag must be escaped');
            assert.ok(body.html.includes('A&quot;B&lt;C'),
                'quote and angle bracket must be escaped in tempPassword');
        });
    });

    describe('sendAssessmentResults', () => {
        it('sends an email with risk score and level', async () => {
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 42,
                riskLevel: 'MEDIUM',
                userData: { age: 30, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No' },
                categoryRisks: { Lifestyle: 20 },
                recommendations: ['Exercise regularly'],
                assessmentType: 'colorectal'
            });
            assert.strictEqual(fetchCalls.length, 1);
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.strictEqual(body.to, 'user@example.com');
            assert.ok(body.html.includes('42'));
            assert.ok(body.html.includes('MEDIUM'));
            assert.ok(body.subject.includes('Colorectal'));
        });

        it('escapes HTML in userData fields', async () => {
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 10,
                riskLevel: 'LOW',
                userData: { age: '<b>30</b>', gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No' },
                assessmentType: 'colorectal'
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.ok(!body.html.includes('<b>30</b>'));
            assert.ok(body.html.includes('&lt;b&gt;30&lt;/b&gt;'));
        });
    });
});
