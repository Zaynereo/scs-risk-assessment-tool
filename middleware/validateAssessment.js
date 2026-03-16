import { z } from 'zod';

// Define exactly what shape and types are allowed
const answerSchema = z.object({
    questionId: z.string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Question ID must be alphanumeric'),
    answer: z.enum(['Yes', 'No'], {
        errorMap: () => ({ message: 'Answer must be Yes or No' })
    })
});

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
    familyHistory: z.boolean({
        errorMap: () => ({ message: 'Family history must be true or false' })
    }),
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

// Middleware function to validate incoming assessment payload
export function validateAssessment(req, res, next) {
    const result = assessmentSchema.safeParse(req.body);
    if (!result.success) {
        // Safely handle errors even if .errors is undefined
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
    riskScore: z.number()
        .min(0)
        .max(100),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    userData: userDataSchema,
    assessmentType: z.string()
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
    categoryRisks: z.record(z.string(), z.number()).optional(),
    cancerTypeScores: z.record(z.string(), z.any()).optional(),
    recommendations: z.array(z.any()).optional()
});

export function validateSendResults(req, res, next) {
    const result = sendResultsSchema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));
        return res.status(400).json({
            success: false,
            error: 'Invalid request data',
            details: errors
        });
    }
    req.body = result.data;
    next();
}