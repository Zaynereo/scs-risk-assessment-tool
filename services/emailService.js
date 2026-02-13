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