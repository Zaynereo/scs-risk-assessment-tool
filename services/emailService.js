import dotenv from 'dotenv';
import { SettingsModel } from '../models/settingsModel.js';
import { RISK_CATEGORY_KEYS } from '../public/js/constants.js';

dotenv.config();

const settingsModel = new SettingsModel();

const EMAIL_FALLBACK_EN = {
    yourInformation: 'Your Information',
    ageLabel: 'Age',
    genderLabel: 'Gender',
    ethnicityLabel: 'Ethnicity',
    familyHistoryLabel: 'Family History',
    assessmentTypeLabel: 'Assessment Type',
    emailSubject: 'Your {type} Cancer Risk Assessment Results',
    emailSubjectGeneric: 'Your General Cancer Risk Assessment Results',
    riskFactorFallback: 'Risk factors identified in this category.',
    recommendationsFallback: 'Maintain a healthy lifestyle and schedule regular check-ups with your doctor.',
    riskFactorsHeading: 'Your Risk Factors',
    cancerBreakdownHeading: 'Possible Cancers at Risk',
    recommendationsHeading: 'What You Can Do',
    bookScreening: 'Book Your Cancer Screening Appointment With Us Today!',
    bookHealthierSG: 'Book Your HealthierSG Screening Appointment',
    disclaimer: 'Disclaimer: This game is for educational purposes only and is not medical advice. The result is based on your self-reported answers to common risk factors. Please consult a doctor for a personal health assessment.',
    healthyLifestyle: 'You have led a healthy lifestyle and are not at risk of any cancer!',
    summaryLow: 'Great job! Your lifestyle choices show low risk for {cancer}.',
    summaryMedium: 'Your results show some areas that could be improved to reduce your risk. Review the breakdown below for details.',
    summaryHigh: 'This is not a diagnosis. Your results indicate several risk factors. Consider making changes and consulting a doctor — they can help you understand your risk and next steps.',
    categoryDiet: 'Diet & Nutrition',
    categoryLifestyle: 'Lifestyle',
    categoryMedical: 'Medical History',
    categoryFamily: 'Family & Genetics',
};

function applyReplacements(str, replacements) {
    return Object.entries(replacements || {}).reduce(
        (s, [k, v]) => s.replaceAll(`{${k}}`, v),
        str
    );
}

function makeTranslator(translations, lang) {
    return function t(group, key, replacements = {}) {
        const val = translations?.[group]?.[key]?.[lang]
            || translations?.[group]?.[key]?.en
            || EMAIL_FALLBACK_EN[key]
            || '';
        return applyReplacements(val, replacements);
    };
}

async function loadTranslationsSafe() {
    try {
        return await settingsModel.getTranslations();
    } catch (err) {
        console.warn('[email i18n] Falling back to English — translations load failed:', err.message);
        return {};
    }
}

async function sendEmail({ to, subject, html, text }) {
    const apiKey = process.env.EMAIL_PASSWORD;
    const from = process.env.EMAIL_FROM || 'Singapore Cancer Society <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html, text }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Resend API error:', data);
        throw new Error(`Failed to send email: ${data.message || response.statusText}`);
    }

    console.log('Email sent successfully, id:', data.id);
    return data;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

class EmailService {
    async sendPasswordResetEmail(email, resetToken) {
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/resetPassword.html?token=${resetToken}`;
        return sendEmail({
            to: email,
            subject: 'Password Reset Request - SCS Risk Assessment',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #007bff 0%, #e07872 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                        .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>Password Reset Request</h1></div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>You recently requested to reset your password for your SCS Risk Assessment admin account. Click the button below to reset it:</p>
                            <p style="text-align: center;">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </p>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                            <p><strong>This link will expire in 1 hour.</strong></p>
                            <p>If you didn't request a password reset, you can safely ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply.</p>
                            <p>&copy; 2026 SCS Risk Assessment</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Password Reset\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.`
        });
    }

    async sendAssessmentResults(to, data) {
        const { riskScore, riskLevel, userData, categoryRisks, recommendations, assessmentType, cancerTypeScores, language } = data;
        const lang = ['en', 'zh', 'ms', 'ta'].includes(language) ? language : 'en';

        const translations = await loadTranslationsSafe();
        const t = makeTranslator(translations, lang);

        const safe = {
            age: escapeHtml(userData?.age),
            gender: escapeHtml(userData?.gender),
            ethnicity: escapeHtml(userData?.ethnicity),
            familyHistory: escapeHtml(userData?.familyHistory),
            assessmentType: escapeHtml(assessmentType),
            riskLevel: escapeHtml(riskLevel),
            riskScore: escapeHtml(riskScore),
        };

        const isGeneric = assessmentType === 'generic';
        const cancerName = isGeneric ? '' : (assessmentType || '');

        let displayRiskLevel = riskLevel;
        let filteredCancerScores = {};

        if (isGeneric && cancerTypeScores) {
            const gender = userData?.gender?.toLowerCase();
            for (const [type, info] of Object.entries(cancerTypeScores)) {
                const score = typeof info === 'object' ? (info.score ?? info) : info;
                const gf = (typeof info === 'object' && info.genderFilter) ? info.genderFilter.toLowerCase() : 'all';
                if (gender && gf !== 'all' && gf !== gender) continue;
                if (score >= 30) filteredCancerScores[type] = info;
            }
            const scores = Object.values(filteredCancerScores);
            if (scores.length > 0) {
                const highest = scores.reduce((max, s) => {
                    const score = typeof s === 'object' ? (s.score ?? s) : s;
                    const maxScore = typeof max === 'object' ? (max.score ?? max) : max;
                    return score > maxScore ? s : max;
                });
                displayRiskLevel = (typeof highest === 'object' && highest.riskLevel) ? highest.riskLevel : riskLevel;
            }
        }

        const summaryKey = displayRiskLevel === 'LOW' ? 'summaryLow'
            : displayRiskLevel === 'HIGH' ? 'summaryHigh'
            : 'summaryMedium';
        const summaryText = escapeHtml(t('results', summaryKey, { cancer: cancerName }));

        // ── RISK FACTOR BREAKDOWN ────────────
        const riskFactorFallback = escapeHtml(t('results', 'riskFactorFallback'));
        let riskBreakdownHtml = '';
        if (categoryRisks && Object.keys(categoryRisks).length > 0) {
            const categoryRows = Object.entries(categoryRisks)
                .map(([category, info]) => {
                    const factors = info?.factors || [];

                    const score = typeof info === 'object' ? (info.score ?? 0) : (info ?? 0);
                    if (factors.length === 0 && score === 0) return '';

                    const translationKey = RISK_CATEGORY_KEYS[category];
                    const displayCategory = translationKey
                        ? escapeHtml(t('results', translationKey) || category)
                        : escapeHtml(category);

                    const factorItems = factors.length > 0
                        ? factors.map(f => `<li style="margin: 6px 0; color: #555; font-size: 14px;">${escapeHtml(f)}</li>`).join('')
                        : `<li style="margin: 6px 0; color: #555; font-size: 14px; font-style: italic;">${riskFactorFallback}</li>`;
                    return `
                        <div style="background: white; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #e8e8e8; border-left: 3px solid #e07872;">
                            <div style="font-weight: 600; color: #e07872; margin-bottom: 8px;">${displayCategory}</div>
                            <ul style="margin: 0; padding-left: 18px;">
                                ${factorItems}
                            </ul>
                        </div>
                    `;
                })
                .filter(Boolean)
                .join('');

            if (categoryRows) {
                riskBreakdownHtml = `
                    <div style="margin-bottom: 28px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">
                            ${escapeHtml(t('results', 'riskFactorsHeading'))}
                        </h2>
                        ${categoryRows}
                    </div>
                `;
            }
        }

        // ── CANCER TYPE BREAKDOWN ──────
        let cancerBreakdownHtml = '';
        if (isGeneric) {
            const cancerHeading = escapeHtml(t('results', 'cancerBreakdownHeading'));
            const sorted = Object.entries(filteredCancerScores)
                .map(([type, info]) => {
                    const score = typeof info === 'object' ? (info.score ?? info) : info;
                    const level = typeof info === 'object' ? (info.riskLevel ?? '') : '';
                    return { type, score, level };
                })
                .sort((a, b) => b.score - a.score);

            if (sorted.length > 0) {
                const cancerRows = sorted.map(({ type }) => {
                    const displayName = escapeHtml(type.charAt(0).toUpperCase() + type.slice(1) + ' Cancer');
                    return `
                        <div style="margin-bottom: 16px; background: white; border-radius: 8px; padding: 14px 16px; border: 1px solid #e8e8e8;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 600; font-size: 14px; color: #333;">${displayName}</span>
                            </div>
                        </div>`;
                }).join('');
                cancerBreakdownHtml = `
                    <div style="margin-bottom: 28px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">
                            ${cancerHeading}
                        </h2>
                        ${cancerRows}
                    </div>`;
            } else {
                cancerBreakdownHtml = `
                    <div style="margin-bottom: 28px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">
                            ${cancerHeading}
                        </h2>
                        <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; color: #555; border: 1px solid #e8e8e8;">
                            ${escapeHtml(t('results', 'healthyLifestyle'))}
                        </div>
                    </div>`;
            }
        }

        // ── RECOMMENDATIONS ────────────────
        const recHeading = escapeHtml(t('results', 'recommendationsHeading'));
        let recommendationsHtml = '';
        if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
            const recItems = recommendations.map(rec => {
                if (typeof rec === 'object' && rec !== null) {
                    const title = rec.title || rec.category || '';
                    const actions = Array.isArray(rec.actions) ? rec.actions : [];
                    if (title) {
                        const safeTitle = escapeHtml(title);
                        const actionItems = actions.map(a => {
                            const text = typeof a === 'object' ? (a[lang] || a.en || '') : a;
                            return `<li style="margin: 6px 0; color: #555; font-size: 14px;">${escapeHtml(text)}</li>`;
                        }).join('');
                        return `
                            <div style="background: white; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #e8e8e8; border-left: 3px solid #e07872;">
                                <div style="font-weight: 600; color: #e07872; margin-bottom: 8px;">${safeTitle}</div>
                                ${actionItems ? `<ul style="margin: 0; padding-left: 18px;">${actionItems}</ul>` : ''}
                            </div>`;
                    }
                } else if (typeof rec === 'string') {
                    return `<div style="background: white; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; border: 1px solid #e8e8e8; color: #555; font-size: 14px;">${escapeHtml(rec)}</div>`;
                }
                return '';
            }).filter(Boolean).join('');

            if (recItems) {
                recommendationsHtml = `
                    <div style="margin-bottom: 28px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">
                            ${recHeading}
                        </h2>
                        ${recItems}
                    </div>`;
            }
        }

        if (!recommendationsHtml) {
            recommendationsHtml = `
                <div style="margin-bottom: 28px;">
                    <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 8px; margin-bottom: 16px;">
                        ${recHeading}
                    </h2>
                    <div style="background: white; border-radius: 8px; padding: 14px 16px; border: 1px solid #e8e8e8; border-left: 3px solid #e07872; color: #555; font-size: 14px;">
                        ${escapeHtml(t('results', 'recommendationsFallback'))}
                    </div>
                </div>`;
        }

        const assessmentTypeDisplay = safe.assessmentType
            ? safe.assessmentType.charAt(0).toUpperCase() + safe.assessmentType.slice(1)
            : 'General';

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #e07872 0%, #c0504a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0 0 6px; font-size: 22px;">${escapeHtml(t('results', 'resultsHeading') || 'Your Health Assessment Summary')}</h1>
                    <p style="margin: 0; font-size: 13px; opacity: 0.9;">Singapore Cancer Society</p>
                </div>

                <!-- Body -->
                <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 10px 10px;">

                    <!-- Summary -->
                    <div style="background: white; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #e8e8e8;">
                        <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6;">${summaryText}</p>
                    </div>

                    ${riskBreakdownHtml}
                    ${cancerBreakdownHtml}

                    ${recommendationsHtml}

                    <!-- CTA Buttons -->
                    <div style="margin-bottom: 24px;">
                        <a href="https://www.singaporecancersociety.org.sg/get-screened/book-your-screening-appointment-at-scs-clinic-bishan.html"
                           style="display: block; background: #e07872; color: white; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; margin-bottom: 10px; font-size: 15px;">
                            📅 ${escapeHtml(t('results', 'bookScreening'))}
                        </a>
                        <a href="https://book.health.gov.sg/healthiersg-screening"
                           style="display: block; background: white; color: #e07872; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; border: 2px solid #e07872; font-size: 15px;">
                            🏥 ${escapeHtml(t('results', 'bookHealthierSG'))}
                        </a>
                    </div>

                    <!-- Your Information -->
                    <div style="background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #e8e8e8;">
                        <h3 style="margin: 0 0 12px; font-size: 15px; color: #555;">${escapeHtml(t('results', 'yourInformation'))}</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr><td style="padding: 4px 0; color: #888; width: 45%;">${escapeHtml(t('results', 'assessmentTypeLabel'))}</td><td style="color: #333; font-weight: 500;">${assessmentTypeDisplay}</td></tr>
                            <tr><td style="padding: 4px 0; color: #888;">${escapeHtml(t('results', 'ageLabel'))}</td><td style="color: #333; font-weight: 500;">${safe.age || '—'}</td></tr>
                            <tr><td style="padding: 4px 0; color: #888;">${escapeHtml(t('results', 'genderLabel'))}</td><td style="color: #333; font-weight: 500;">${safe.gender || '—'}</td></tr>
                            <tr><td style="padding: 4px 0; color: #888;">${escapeHtml(t('results', 'ethnicityLabel'))}</td><td style="color: #333; font-weight: 500;">${safe.ethnicity || '—'}</td></tr>
                            <tr><td style="padding: 4px 0; color: #888;">${escapeHtml(t('results', 'familyHistoryLabel'))}</td><td style="color: #333; font-weight: 500;">${safe.familyHistory || '—'}</td></tr>
                        </table>
                    </div>

                    <!-- Disclaimer -->
                    <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 14px 16px; border-radius: 6px; font-size: 12px; color: #777; line-height: 1.5;">
                        ${escapeHtml(t('results', 'disclaimer'))}
                    </div>
                </div>

                <!-- Footer -->
                <div style="text-align: center; color: #999; font-size: 12px; margin-top: 16px; padding-top: 16px;">
                    <p style="margin: 0;">Singapore Cancer Society &nbsp;|&nbsp;
                        <a href="https://www.singaporecancersociety.org.sg" style="color: #e07872; text-decoration: none;">www.singaporecancersociety.org.sg</a>
                    </p>
                </div>
            </div>
        </body>
        </html>`;

        const subject = isGeneric
            ? t('results', 'emailSubjectGeneric')
            : t('results', 'emailSubject', {
                type: assessmentType ? assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1) : ''
            });

        return sendEmail({
            to,
            subject,
            html: htmlContent,
        });
    }

    async sendNewAdminEmail(to, { name, tempPassword }) {
        const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login.html`;
        return sendEmail({
            to,
            subject: 'Your SCS Risk Assessment Admin Account',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #007bff 0%, #e07872 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                        .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                        .credentials { background: white; border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin: 16px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>Welcome to SCS Admin Panel</h1></div>
                        <div class="content">
                            <p>Hello ${escapeHtml(name)},</p>
                            <p>An admin account has been created for you on the SCS Risk Assessment platform. Here are your login details:</p>
                            <div class="credentials">
                                <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                                <p><strong>Email:</strong> ${escapeHtml(to)}</p>
                                <p><strong>Temporary Password:</strong> ${escapeHtml(tempPassword)}</p>
                            </div>
                            <p style="text-align: center;">
                                <a href="${loginUrl}" class="button">Login Now</a>
                            </p>
                            <p><strong>⚠️ You will be required to change your password on first login.</strong></p>
                            <p>If you did not expect this email, please contact your administrator.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply.</p>
                            <p>&copy; 2026 SCS Risk Assessment</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Welcome to SCS Admin Panel\n\nHello ${name},\n\nYour admin account has been created.\n\nLogin URL: ${loginUrl}\nEmail: ${to}\nTemporary Password: ${tempPassword}\n\nYou will be required to change your password on first login.`
        });
    }

    async verifyConnection() {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.EMAIL_PASSWORD}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM,
                    to: 'test@resend.dev',
                    subject: 'Connection test',
                    html: '<p>test</p>'
                })
            });
            if (response.ok || response.status === 422) {
                console.log('✓ Resend API email service is ready');
                return true;
            } else {
                const data = await response.json();
                console.error('✗ Resend API error:', data.message || response.statusText);
                return false;
            }
        } catch (error) {
            console.error('✗ Email service error:', error);
            return false;
        }
    }
}

export default new EmailService();