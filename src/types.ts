import type { z } from "zod";

// Type for an MCP tool
export interface Tool {
	name: string;
	description: string;
	schema: Record<string, z.ZodTypeAny>;
	handler: (params: Record<string, unknown>) => Promise<unknown>;
}
