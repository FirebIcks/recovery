import { z } from 'zod';
import { nonEmptyString } from './scalars';

export const recoverKeysInput = z.object({
  backupZip: nonEmptyString('Backup Kit is required').describe('Base64-encoded string representation of backup ZIP file'),
  passphrase: z.string().optional().describe('Recovery passphrase if not auto generated'),
  rsaKey: nonEmptyString('Recovery private key is required').describe('Recovery private key'),
  rsaKeyPassphrase: z.string().trim().describe('Recovery private key passphrase'),
  autoGeneratedPass: z.boolean().describe('Auto generated passphrase'),
  agpRsaKey: z.string().optional().describe('The auto generated passphrase Base64 encoded RSA file'),
  agpRsaPassphrase: z.string().optional().describe('The auto generated passphrase RSA passphrase'),
  recoverOnlyNCW: z.boolean().describe('Should recover only NCW').default(false),
});

export type RecoverKeysInput = z.infer<typeof recoverKeysInput>;
