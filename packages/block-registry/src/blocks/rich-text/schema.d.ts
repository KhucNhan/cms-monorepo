import { z } from 'zod';
export declare const richTextSchema: z.ZodObject<{
    content: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    htmlFallback: z.ZodString;
    textAlign: z.ZodDefault<z.ZodEnum<["left", "center", "right", "justify"]>>;
}, "strip", z.ZodTypeAny, {
    content: Record<string, unknown>;
    htmlFallback: string;
    textAlign: "left" | "center" | "right" | "justify";
}, {
    content: Record<string, unknown>;
    htmlFallback: string;
    textAlign?: "left" | "center" | "right" | "justify" | undefined;
}>;
export type RichTextData = z.infer<typeof richTextSchema>;
