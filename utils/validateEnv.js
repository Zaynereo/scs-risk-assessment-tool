const requiredEnvVars = [
    { key: 'DATABASE_URL', description: 'Supabase PostgreSQL connection string' },
    { key: 'JWT_SECRET', description: 'JWT signing secret' },
    { key: 'EMAIL_HOST', description: 'SMTP host' },
    { key: 'EMAIL_PORT', description: 'SMTP port' },
    { key: 'EMAIL_USER', description: 'SMTP username' },
    { key: 'EMAIL_PASSWORD', description: 'Resend API key (used as SMTP password)' },
    { key: 'EMAIL_FROM', description: 'Sender email address' },
];

export function validateEnv() {
    const missing = [];

    // Check required vars
    for (const { key, description } of requiredEnvVars) {
        if (!process.env[key]) {
            missing.push(`✗ ${key} — ${description}`);
        }
    }
    if (missing.length > 0) {
        console.error('\nMissing required environment variables:\n');
        missing.forEach(msg => console.error(msg));
        console.error('\nPlease configure your .env file and restart the server.\n');
        process.exit(1);
    }
    console.log('✓ All required environment variables are set');
}