import type { Buffer } from 'buffer';

// TEMP
type Buf = any; // Placeholder for buffer

export type UTXO = BTCLegacyUTXO | BTCSegwitUTXO | StdUTXO;

export type BTCLegacyUTXO = StdUTXO & { nonWitnessUtxo: Buf };

export type BTCSegwitUTXO = StdUTXO & { witnessUtxoScript: Buf };

export type StdUTXO = { confirmed?: boolean; hash: string; index: number; value: number };

export const BaseUTXOType = 'b';

export const SegwitUTXOType = 'bs';

export const LegacyUTXOType = 'bl';

export type UTXOType = 'b' | 'bs' | 'bl';

export type AccountData = {
  balance: number;
  utxos?: UTXO[];
  utxoType?: UTXOType;
  feeRate?: number;
  nonce?: number;
  gasPrice?: bigint | null;
  extraParams?: Map<string, any>;
  endpoint?: string;
  insufficientBalance?: boolean;
};

export type TxPayload = {
  derivationPath: [44, number, number, number, number];
  tx: string;
};

export type RawSignature = {
  r: string;
  s: string;
  v: number;
};
