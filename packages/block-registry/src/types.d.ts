import type { ZodSchema, z } from 'zod';
export interface BlockDefinition<S extends ZodSchema = ZodSchema> {
    type: string;
    label: string;
    icon: string;
    schema: S;
    defaultData: z.infer<S>;
    Editor?: any;
    Renderer?: any;
}
export interface BlockEditorProps<T = Record<string, unknown>> {
    value: T;
    onChange: (next: T) => void;
    errors?: Record<string, string[]>;
}
export interface BlockRendererProps<T = Record<string, unknown>> {
    data: T;
}
