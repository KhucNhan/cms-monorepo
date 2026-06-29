import type { BlockDefinition } from './types';
export declare const blockRegistry: Map<string, BlockDefinition<import("zod").ZodType<any, import("zod").ZodTypeDef, any>>>;
export declare function getBlockDefinition(type: string): BlockDefinition;
export declare function getAllBlockDefinitions(): BlockDefinition[];
export declare function isValidBlockType(type: string): boolean;
