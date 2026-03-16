import dotenv from 'dotenv';

dotenv.config();

async function sendEmail({ to, subject, html, text }) {
    const apiKey = process.env.EMAIL_PASSWORD; // reusing your existing env var
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
        const { riskScore, riskLevel, userData, categoryRisks, recommendations, assessmentType, cancerTypeScores } = data;

        const safe = {
            age: escapeHtml(userData?.age),
            gender: escapeHtml(userData?.gender),
            ethnicity: escapeHtml(userData?.ethnicity),
            familyHistory: escapeHtml(userData?.familyHistory),
            assessmentType: escapeHtml(assessmentType),
            riskLevel: escapeHtml(riskLevel),
            riskScore: escapeHtml(riskScore),
        };

        const isGeneric = assessmentType === 'generic' && cancerTypeScores && Object.keys(cancerTypeScores).length > 0;
        const riskColor = riskLevel === 'HIGH' ? '#d32f2f' : riskLevel === 'MEDIUM' ? '#f57c00' : '#388e3c';
        const cancerBreakdownHtml = isGeneric
            ? Object.entries(cancerTypeScores).map(([cancer, info]) => {
                const safeCancer = escapeHtml(cancer);
                const score = typeof info === 'object' ? info.score ?? info : info;
                const level = typeof info === 'object' ? info.level ?? '' : '';
                const safeLevel = escapeHtml(level);
                const levelColor = level === 'HIGH' ? '#d32f2f' : level === 'MEDIUM' ? '#f57c00' : '#388e3c';
                const barWidth = Math.min(Math.round(score), 100);
                return `
                <div style="margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <strong style="font-size: 0.95em;">${safeCancer}</strong>
                        ${safeLevel ? `<span ...>${safeLevel}</span>` : ''}
                    </div>
                    <div style="background: #e0e0e0; border-radius: 6px; height: 10px; overflow: hidden;">
                        <div style="width: ${barWidth}%; background: ${levelColor}; height: 100%; border-radius: 6px;"></div>
                    </div>
                    <div style="font-size: 0.8em; color: #888; margin-top: 2px;">${Math.round(score)}% risk score</div>
                </div>`;
            }).join('')
            : '';

        const categoryRisksHtml = !isGeneric && categoryRisks && Object.keys(categoryRisks).length > 0
            ? Object.entries(categoryRisks).map(([category, score]) => 
                `<li>${escapeHtml(category)}: ${escapeHtml(score.toFixed(1))}%</li>`
            ).join('')
            : '';

        let recommendationsHtml = '';
        if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
            recommendations.forEach(rec => {
                if (typeof rec === 'object' && rec !== null) {
                    if (rec.title && Array.isArray(rec.actions)) {
                        const safeTitle = escapeHtml(rec.title);
                        const safeActions = rec.actions.map(a => `<li style="margin: 6px 0; color: #555;">${escapeHtml(a)}</li>`).join('');
                        recommendationsHtml += `<li style="margin-bottom: 20px;"><strong style="color: #e07872;">${safeTitle}</strong><ul style="margin-top: 8px; padding-left: 20px;">${safeActions}</ul></li>`;
                    } else if (rec.category && Array.isArray(rec.actions)) {
                        const safeCategory = escapeHtml(rec.category);
                        const safeActions = rec.actions.map(a => `<li style="margin: 6px 0; color: #555;">${escapeHtml(a)}</li>`).join('');
                        recommendationsHtml += `<li style="margin-bottom: 20px;"><strong style="color: #e07872;">${safeCategory}</strong><ul style="margin-top: 8px; padding-left: 20px;">${safeActions}</ul></li>`;
                    } else if (rec.text || rec.action) {
                        recommendationsHtml += `<li style="margin: 10px 0; color: #555;">${escapeHtml(rec.text || rec.action)}</li>`;
                    }
                } else if (typeof rec === 'string') {
                    recommendationsHtml += `<li style="margin: 10px 0; color: #555;">${escapeHtml(rec)}</li>`;
                }
            });
        }
        if (!recommendationsHtml) {
            recommendationsHtml = '<li style="color: #555;">Maintain a healthy lifestyle and regular check-ups</li>';
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #e07872 0%, #c0504a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 22px;">Your Cancer Risk Assessment Results</h1>
                    <p style="margin: 6px 0 0; font-size: 13px;">Singapore Cancer Society</p>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    ${!isGeneric ? `
                    <div style="background: white; padding: 20px; margin-bottom: 24px; border-radius: 8px; border-left: 4px solid ${riskColor};">
                        <p style="margin: 0 0 4px; color: #666; font-size: 13px;">Your Overall Risk Level</p>
                        <div style="font-size: 26px; font-weight: bold; color: ${riskColor};">${riskLevel} RISK</div>
                        <div style="text-align: center; margin-top: 12px;">
                            <div style="font-size: 48px; font-weight: bold; color: ${riskColor};">${riskScore}%</div>
                            <p style="margin: 4px 0 0; color: #888; font-size: 13px;">Overall Risk Score</p>
                        </div>
                    </div>` : ''}

                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 6px;">📋 Your Information</h2>
                        <ul style="padding-left: 20px;">
                            <li><strong>Assessment Type:</strong> ${safe.assessmentType ? safe.assessmentType.charAt(0).toUpperCase() + safe.assessmentType.slice(1) : 'General'}</li>
                            <li><strong>Age:</strong> ${safe.age || '-'}</li>
                            <li><strong>Gender:</strong> ${safe.gender || '-'}</li>
                            <li><strong>Ethnicity:</strong> ${safe.ethnicity || '-'}</li>
                            <li><strong>Family History:</strong> ${safe.familyHistory || '-'}</li>
                        </ul>
                    </div>

                    ${isGeneric ? `
                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 6px;">🎯 Your Cancer-Specific Risk Breakdown</h2>
                        <div style="background: white; padding: 16px; border-radius: 8px;">${cancerBreakdownHtml}</div>
                    </div>` : categoryRisksHtml ? `
                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 6px;">📊 Risk Factor Breakdown</h2>
                        <ul style="padding-left: 20px;">${categoryRisksHtml}</ul>
                    </div>` : ''}

                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 17px; color: #e07872; border-bottom: 2px solid #e07872; padding-bottom: 6px;">💡 What You Can Do</h2>
                        <ul style="list-style-type: none; padding-left: 0;">${recommendationsHtml}</ul>
                    </div>

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://www.singaporecancersociety.org.sg/get-screened/book-your-screening-appointment-at-scs-clinic-bishan.html"
                           style="display: inline-block; background: #e07872; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            📅 Book Your Screening Appointment
                        </a>
                    </div>

                    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 14px; border-radius: 6px; font-size: 13px;">
                        <strong>⚠️ Important Disclaimer</strong><br>
                        This assessment is for educational purposes only and is not medical advice. Please consult a healthcare professional for a comprehensive health assessment.
                    </div>
                </div>
                <div style="text-align: center; color: #999; font-size: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee;">
                    <p>Singapore Cancer Society &nbsp;|&nbsp; <a href="https://www.singaporecancersociety.org.sg" style="color: #e07872;">www.singaporecancersociety.org.sg</a></p>
                </div>
            </div>
        </body>
        </html>`;

        return sendEmail({
            to,
            subject: `Your ${isGeneric ? 'General' : assessmentType?.charAt(0).toUpperCase() + assessmentType?.slice(1) || ''} Cancer Risk Assessment Results`,
            html: htmlContent,
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
                    to: 'test@resend.dev', // Resend's built-in test address
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