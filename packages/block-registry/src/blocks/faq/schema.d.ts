import { z } from 'zod';
declare const faqItemSchema: z.ZodObject<{
    question: z.ZodString;
    answer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    question: string;
    answer: string;
}, {
    question: string;
    answer: string;
}>;
export declare const faqSchema: z.ZodObject<{
    heading: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        question: string;
        answer: string;
    }, {
        question: string;
        answer: string;
    }>, "many">;
    allowMultipleOpen: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    items: {
        question: string;
        answer: string;
    }[];
    allowMultipleOpen: boolean;
    heading?: string | undefined;
}, {
    items: {
        question: string;
        answer: string;
    }[];
    heading?: string | undefined;
    allowMultipleOpen?: boolean | undefined;
}>;
export type FaqData = z.infer<typeof faqSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export {};
