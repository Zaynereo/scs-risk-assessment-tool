import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }

    async sendPasswordResetEmail(email, resetToken) {
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/resetPassword.html?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'SCS Risk Assessment <noreply@scs.com>',
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
                        <div class="header">
                            <h1>Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>You recently requested to reset your password for your SCS Risk Assessment admin account. Click the button below to reset it:</p>
                            <p style="text-align: center;">
                                <a href="${resetUrl}" class="button">Reset Password</a>
                            </p>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px;">
                                ${resetUrl}
                            </p>
                            <p><strong>This link will expire in 1 hour.</strong></p>
                            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply.</p>
                            <p>&copy; 2026 SCS Risk Assessment</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Password Reset Request
                
                You recently requested to reset your password for your SCS Risk Assessment admin account.
                
                Click this link to reset your password:
                ${resetUrl}
                
                This link will expire in 1 hour.
                
                If you didn't request a password reset, you can safely ignore this email.
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    async sendAssessmentResults(to, data) {
        const { riskScore, riskLevel, userData, categoryRisks, recommendations, assessmentType } = data;

        // Format category risks
        const categoryRisksHtml = categoryRisks && Object.keys(categoryRisks).length > 0
            ? Object.entries(categoryRisks)
                .map(([category, score]) => `<li>${category}: ${score.toFixed(1)}%</li>`)
                .join('')
            : '<li>No specific risk factors identified</li>';

        // Format recommendations
        let recommendationsHtml = '';
        if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
            recommendations.forEach(rec => {
                if (typeof rec === 'object' && rec !== null) {
                    // Has title and actions structure
                    if (rec.title && Array.isArray(rec.actions)) {
                        recommendationsHtml += `
                        <li style="margin-bottom: 20px;">
                            <strong style="color: #667eea; font-size: 1.05em;">${rec.title}</strong>
                            <ul style="margin-top: 8px; padding-left: 20px; list-style-type: disc;">
                                ${rec.actions.map(action => `<li style="margin: 6px 0; color: #555;">${action}</li>`).join('')}
                            </ul>
                        </li>`;
                    }
                    // Has category and actions structure
                    else if (rec.category && Array.isArray(rec.actions)) {
                        recommendationsHtml += `
                        <li style="margin-bottom: 20px;">
                            <strong style="color: #667eea; font-size: 1.05em;">${rec.category}</strong>
                            <ul style="margin-top: 8px; padding-left: 20px; list-style-type: disc;">
                                ${rec.actions.map(action => `<li style="margin: 6px 0; color: #555;">${action}</li>`).join('')}
                            </ul>
                        </li>`;
                    }
                    // Has items array
                    else if (rec.items && Array.isArray(rec.items)) {
                        const title = rec.title || rec.category || 'Recommendation';
                        recommendationsHtml += `
                        <li style="margin-bottom: 20px;">
                            <strong style="color: #667eea; font-size: 1.05em;">${title}</strong>
                            <ul style="margin-top: 8px; padding-left: 20px; list-style-type: disc;">
                                ${rec.items.map(item => `<li style="margin: 6px 0; color: #555;">${item}</li>`).join('')}
                            </ul>
                        </li>`;
                    }
                    // Simple text property
                    else if (rec.text || rec.action) {
                        recommendationsHtml += `<li style="margin: 10px 0; color: #555;">${rec.text || rec.action}</li>`;
                    }
                }
                // Plain string
                else if (typeof rec === 'string') {
                    recommendationsHtml += `<li style="margin: 10px 0; color: #555;">${rec}</li>`;
                }
            });
        }

        // Fallback if no recommendations were formatted
        if (!recommendationsHtml) {
            recommendationsHtml = '<li style="color: #555;">Maintain a healthy lifestyle and regular check-ups</li>';
        }

        // Determine risk level color
        const riskColor = riskLevel === 'HIGH' ? '#d32f2f'
            : riskLevel === 'MEDIUM' ? '#f57c00'
                : '#388e3c';

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .risk-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid ${riskColor}; }
                .risk-level { color: ${riskColor}; font-size: 28px; font-weight: bold; margin: 10px 0; }
                .score { font-size: 48px; font-weight: bold; color: ${riskColor}; }
                .section { margin: 25px 0; }
                .section h2 { color: #667eea; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
                ul { padding-left: 20px; }
                li { margin: 8px 0; line-height: 1.6; }
                .nested-list { margin-top: 8px; padding-left: 20px; }
                .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
                .disclaimer { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your Cancer Risk Assessment Results</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Singapore Cancer Society</p>
                </div>
                
                <div class="content">
                    <div class="risk-box">
                        <p style="margin: 0; color: #666;">Your Risk Level</p>
                        <div class="risk-level">${riskLevel} RISK</div>
                        <div style="text-align: center; margin-top: 15px;">
                            <div class="score">${riskScore}%</div>
                            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Risk Score</p>
                        </div>
                    </div>

                    <div class="section">
                        <h2>📋 Your Information</h2>
                        <ul>
                            <li><strong>Assessment Type:</strong> ${assessmentType ? assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1) : 'General'}</li>
                            <li><strong>Age:</strong> ${userData.age}</li>
                            <li><strong>Gender:</strong> ${userData.gender}</li>
                            <li><strong>Ethnicity:</strong> ${userData.ethnicity}</li>
                            <li><strong>Family History:</strong> ${userData.familyHistory}</li>
                        </ul>
                    </div>

                    ${categoryRisks && Object.keys(categoryRisks).length > 0 ? `
                    <div class="section">
                        <h2>📊 Risk Factor Breakdown</h2>
                        <ul>
                            ${categoryRisksHtml}
                        </ul>
                    </div>
                    ` : ''}

                    <div class="section">
                        <h2>💡 What You Can Do</h2>
                        <ul style="list-style-type: none; padding-left: 0;">
                            ${recommendationsHtml}
                        </ul>
                    </div>

                    <div style="text-align: center;">
                        <a href="https://www.singaporecancersociety.org.sg/get-screened/book-your-screening-appointment-at-scs-clinic-bishan.html" class="cta-button">
                            📅 Book Your Screening Appointment
                        </a>
                    </div>

                    <div class="disclaimer">
                        <strong>⚠️ Important Disclaimer</strong><br>
                        This assessment is for educational purposes only and is not medical advice. The results are based on your self-reported answers to common risk factors. Please consult with a healthcare professional for a comprehensive health assessment and personalized medical advice.
                    </div>
                </div>

                <div class="footer">
                    <p>Singapore Cancer Society<br>
                    <a href="https://www.singaporecancersociety.org.sg">www.singaporecancersociety.org.sg</a></p>
                    <p style="margin-top: 10px; color: #999;">This email was sent because you requested your cancer risk assessment results.</p>
                </div>
            </div>
        </body>
        </html>
    `;

        const mailOptions = {
            from: `"Singapore Cancer Society" <${process.env.EMAIL_USER}>`,
            to,
            subject: 'Your Cancer Risk Assessment Results - Singapore Cancer Society',
            html: htmlContent
        };

        return this.transporter.sendMail(mailOptions);
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✓ Email service is ready');
            return true;
        } catch (error) {
            console.error('✗ Email service error:', error);
            return false;
        }
    }
}

export default new EmailService();