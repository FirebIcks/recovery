import { z } from 'zod';

export const settingsInput = z.object({
  idleMinutes: z.number().int().positive().describe('Number of idle minutes before resetting'),
  relayBaseUrl: z.string().trim().url().min(1, 'URL is required').describe('Recovery Relay base URL'),
  useProtobuf: z.boolean().default(true).describe('Use protobuf for qR generation'),
});

export type SettingsInput = z.infer<typeof settingsInput>;
