import { z } from 'zod';
export declare const heroSchema: z.ZodObject<{
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    image: z.ZodObject<{
        mediaId: z.ZodString;
        alt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        mediaId: string;
        alt: string;
    }, {
        mediaId: string;
        alt: string;
    }>;
    buttonText: z.ZodOptional<z.ZodString>;
    buttonHref: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    alignment: z.ZodDefault<z.ZodEnum<["left", "center", "right"]>>;
    overlayOpacity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title: string;
    image: {
        mediaId: string;
        alt: string;
    };
    alignment: "left" | "center" | "right";
    overlayOpacity: number;
    subtitle?: string | undefined;
    buttonText?: string | undefined;
    buttonHref?: string | undefined;
}, {
    title: string;
    image: {
        mediaId: string;
        alt: string;
    };
    subtitle?: string | undefined;
    buttonText?: string | undefined;
    buttonHref?: string | undefined;
    alignment?: "left" | "center" | "right" | undefined;
    overlayOpacity?: number | undefined;
}>;
export type HeroData = z.infer<typeof heroSchema>;
