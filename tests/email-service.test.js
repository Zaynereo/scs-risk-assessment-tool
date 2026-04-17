/**
 * Email service tests — mocks global.fetch to verify Resend API requests.
 * Run: NODE_ENV=test node --test tests/email-service.test.js
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import emailService from '../services/emailService.js';
import { setup, teardown } from './helpers/setup.js';

describe('EmailService', () => {
    let originalFetch;
    let fetchCalls;

    before(async () => {
        originalFetch = global.fetch;
        await setup();
    });

    after(async () => {
        global.fetch = originalFetch;
        await teardown();
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
        it('addresses the email to the recipient and includes the recommendation text', async () => {
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
            assert.ok(body.html.includes('Exercise regularly'));
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

        it('renders Chinese section headings when language=zh', async () => {
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 50, riskLevel: 'MEDIUM',
                userData: { age: 40, gender: 'Female', ethnicity: 'Chinese', familyHistory: 'No' },
                categoryRisks: { 'Lifestyle': { score: 20, factors: ['Drinks alcohol'] } },
                recommendations: [], assessmentType: 'breast',
                language: 'zh'
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            // 您的风险因素 = "Your Risk Factors" in zh
            assert.ok(body.html.includes('您的风险因素'), 'risk factors heading should be in Chinese');
            // 您的信息 = "Your Information"
            assert.ok(body.html.includes('您的信息'), 'your information heading should be in Chinese');
            // 免责声明 = start of disclaimer
            assert.ok(body.html.includes('免责声明'), 'disclaimer should be in Chinese');
        });

        it('renders Malay section headings when language=ms', async () => {
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 50, riskLevel: 'MEDIUM',
                userData: { age: 40, gender: 'Female', ethnicity: 'Malay', familyHistory: 'No' },
                categoryRisks: {},
                recommendations: [], assessmentType: 'generic',
                cancerTypeScores: {},
                language: 'ms'
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.ok(body.html.includes('Maklumat Anda'), 'your information heading should be in Malay');
            assert.ok(body.html.includes('Penafian') || body.html.includes('Kekalkan'), 'Malay disclaimer or fallback expected');
        });

        it('falls back to English when language is missing or invalid', async () => {
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 50, riskLevel: 'LOW',
                userData: { age: 40, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No' },
                categoryRisks: { 'Lifestyle': { score: 10, factors: ['Smokes'] } },
                recommendations: [], assessmentType: 'colorectal',
                language: 'xx'
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.ok(body.html.includes('Your Risk Factors'), 'should fall back to English heading');
        });

        it('translates category labels via RISK_CATEGORY_KEYS', async () => {
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 50, riskLevel: 'MEDIUM',
                userData: { age: 40, gender: 'Female', ethnicity: 'Chinese', familyHistory: 'No' },
                categoryRisks: { 'Diet & Nutrition': { score: 20, factors: ['Low fibre diet'] } },
                recommendations: [], assessmentType: 'colorectal',
                language: 'zh'
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            // English category key should NOT leak through when zh translation exists
            assert.ok(!body.html.includes('>Diet &amp; Nutrition<'), 'English category label should be translated');
        });

        it('accepts factors[] shape in categoryRisks without crashing', async () => {
            // Regression: before the fix, .toFixed() was called on the object shape.
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 20, riskLevel: 'LOW',
                userData: { age: 40, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No' },
                categoryRisks: { 'Lifestyle': { score: 15, factors: ['Sits all day', 'Poor sleep'] } },
                recommendations: [], assessmentType: 'colorectal'
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.ok(body.html.includes('Sits all day'));
            assert.ok(body.html.includes('Poor sleep'));
        });

        it('produces a clean subject line when assessmentType is undefined', async () => {
            // Regression: '(assessmentType?.toUpper... + assessmentType?.slice...)' produced "NaN" when undefined
            await emailService.sendAssessmentResults('user@example.com', {
                riskScore: 20, riskLevel: 'LOW',
                userData: { age: 40, gender: 'Male', ethnicity: 'Chinese', familyHistory: 'No' },
                categoryRisks: {},
                recommendations: [],
                assessmentType: undefined
            });
            const body = JSON.parse(fetchCalls[0].opts.body);
            assert.ok(!body.subject.includes('NaN'), `subject must not contain NaN: ${body.subject}`);
            assert.ok(!body.subject.includes('undefined'), `subject must not contain undefined: ${body.subject}`);
        });
    });
});
