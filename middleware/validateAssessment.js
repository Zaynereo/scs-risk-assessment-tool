import { z } from 'zod';

const answerSchema = z.object({
    questionId: z.string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Question ID must be alphanumeric'),
    userAnswer: z.string()
        .transform(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())
        .pipe(z.enum(['Yes', 'No'], {
            errorMap: () => ({ message: 'Answer must be Yes or No' })
        }))
}).passthrough();

const userDataSchema = z.object({
    age: z.number()
        .int('Age must be a whole number')
        .min(1, 'Age must be at least 1')
        .max(120, 'Age must be 120 or below'),
    gender: z.enum(['Male', 'Female'], {
        errorMap: () => ({ message: 'Gender must be Male or Female' })
    }),
    ethnicity: z.enum(['Chinese', 'Malay', 'Indian', 'Caucasian', 'Others'], {
        errorMap: () => ({ message: 'Invalid ethnicity value' })
    }),
    familyHistory: z.union([
        z.boolean(),
        z.enum(['Yes', 'No'])
    ]).transform(val => (val === true || val === 'Yes') ? 'Yes' : 'No'),
    assessmentType: z.string()
        .min(1)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Assessment type must be alphanumeric')
        .optional()
});

export const assessmentSchema = z.object({
    userData: userDataSchema,
    answers: z.array(answerSchema)
        .min(1, 'At least one answer is required')
        .max(100, 'Too many answers submitted')
});

export function validateAssessment(req, res, next) {
    const result = assessmentSchema.safeParse(req.body);
    if (!result.success) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('RAW ZOD ERROR:', JSON.stringify(result.error, null, 2));
            console.error('REQUEST BODY:', JSON.stringify(req.body, null, 2));
        }
        const errors = result.error?.errors?.map(err => ({
            field: err.path.join('.'),
            message: err.message
        })) ?? [{ field: 'unknown', message: result.error?.message || 'Validation failed' }];
        return res.status(400).json({
            success: false,
            error: 'Invalid assessment data',
            details: errors
        });
    }
    req.body = result.data;
    next();
}

const sendResultsSchema = z.object({
    contact: z.string()
        .email('Invalid email address')
        .max(254, 'Email address too long'),
    riskScore: z.coerce.number()
        .min(0)
        .max(100)
        .nullable().optional(),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
    userData: z.record(z.string(), z.any()).optional(),
    assessmentType: z.string()
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
    categoryRisks: z.record(z.string(), z.union([
        z.number(),
        z.object({
            score: z.number().optional(),
            factors: z.array(z.string().max(500)).optional()
        })
    ])).optional(),
    cancerTypeScores: z.record(z.string(), z.any()).nullable().optional(),
    recommendations: z.array(z.any()).optional(),
    answers: z.array(z.object({
        questionText: z.string().max(500).optional(),
        category: z.string().max(100).optional(),
        isRisk: z.boolean().optional()
    }).passthrough()).max(100).optional(),
    language: z.enum(['en', 'zh', 'ms', 'ta']).optional(),
});

export function validateSendResults(req, res, next) {
    const result = sendResultsSchema.safeParse(req.body);
    if (!result.success) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('=== VALIDATION FAILED ===');
            console.error('REQUEST BODY:', JSON.stringify(req.body, null, 2));
            console.error('ZOD ERRORS:', JSON.stringify(result.error?.errors, null, 2));
            console.error('=========================');
        }
        const errors = result.error?.errors?.map(err => ({
            field: err.path.join('.'),
            message: err.message
        })) ?? [{ field: 'unknown', message: 'Validation failed' }];
        return res.status(400).json({
            success: false,
            error: 'Invalid request data',
            details: errors
        });
    }
    req.body = result.data;
    next();
}