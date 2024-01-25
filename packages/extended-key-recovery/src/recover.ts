import fs from 'fs';
import path from 'path';
import AdmZip, { IZipEntry } from 'adm-zip';
import forge from 'node-forge';
import {
  Algorithm,
  CalculatedPrivateKey,
  DecryptRSAPrivateKeyError,
  InvalidRSAPrivateKeyError,
  InvalidRecoveryKitError,
  KeyIdMissingError,
  KeyRecoveryConfig,
  WalletMaster,
  NoMetadataError,
  NoRSAPassphraseError,
  PlayerData,
  RecoveredKeys,
  SigningKeyMetadata,
} from './types';
import { recoverAutoGeneratedPassphrase } from './recoverAGP';
import { parseMetadataFile } from './metadata';
import { recoverMobileKeyShare } from './mobileKey';
import { getPlayerId } from './players';
import { reconstructKeys } from './reconstructKeys';
import { recoverNCWMaster } from './ncw';

const recoverKeysShares = (
  zipFiles: IZipEntry[],
  signingKeys: { [key: string]: SigningKeyMetadata },
  mobilePass: string,
  rsaFileData: string,
  rsaPass: string,
): PlayerData => {
  const players: PlayerData = {};
  for (const file of zipFiles) {
    if (file.entryName.startsWith('MOBILE')) {
      const { keyId, playerId, value } = recoverMobileKeyShare(signingKeys, file.getData().toString(), mobilePass);
      if (players[keyId] === undefined) {
        players[keyId] = {};
      }
      players[keyId][playerId] = value;
    } else if (['metadata.json', 'RSA_PASSPHRASE'].includes(file.entryName)) {
      continue;
    } else {
      let cosigner: string;
      let keyId: string | undefined;
      if (file.entryName.includes('_')) {
        [cosigner, keyId] = file.entryName.split('_');
      } else {
        // Backwards compatability - backup includes just one ECDSA key
        if (Object.keys(signingKeys).length === 1) {
          cosigner = file.entryName;
          keyId = Object.keys(signingKeys)[0];
        } else {
          keyId = undefined;
        }
      }

      if (keyId) {
        let privateKey: forge.pki.rsa.PrivateKey;
        let data: any;
        try {
          data = file.getData().toString('binary');
          privateKey = forge.pki.decryptRsaPrivateKey(rsaFileData, rsaPass);
        } catch (e) {
          throw new DecryptRSAPrivateKeyError();
        }

        if (privateKey === null) {
          throw new InvalidRSAPrivateKeyError();
        }

        let decrypted: any;
        try {
          // @ts-ignore
          decrypted = Buffer.from(privateKey.decrypt(data, 'RSA-OAEP'), 'binary').toString('hex');
        } catch (e) {
          throw new InvalidRecoveryKitError();
        }

        const playerId = getPlayerId(keyId, cosigner!, true).toString();
        if (players[keyId] === undefined) {
          players[keyId] = {};
        }
        players[keyId][playerId] = BigInt(`0x${decrypted}`);
      }
    }
  }

  return players;
};

export const recoverKeys = (params: KeyRecoveryConfig): RecoveredKeys => {
  const zipData: Buffer =
    'zipBase64' in params ? Buffer.from(params.zipBase64, 'base64') : fs.readFileSync(path.resolve(params.zipPath));
  const rsaFileData: string =
    'rsaBase64' in params
      ? Buffer.from(params.rsaBase64, 'base64').toString()
      : fs.readFileSync(path.resolve(params.rsaPath), 'utf-8');
  const autoGeneratedPassphrase = !('mobilePass' in params);
  try {
    new AdmZip(zipData);
  } catch (e) {
    throw new InvalidRecoveryKitError();
  }
  const zip: AdmZip = new AdmZip(zipData);
  const zipFiles: IZipEntry[] = zip.getEntries();
  let metadataFile: IZipEntry | undefined;
  let agpFile: IZipEntry | undefined;

  for (const file of zipFiles) {
    if (file.entryName === 'metadata.json') {
      metadataFile = file;
      if (!autoGeneratedPassphrase || (autoGeneratedPassphrase && agpFile)) {
        break;
      }
    }
    if (autoGeneratedPassphrase && file.entryName === 'RSA_PASSPHRASE') {
      agpFile = file;
    }
  }

  if (!metadataFile) {
    throw new NoMetadataError();
  }
  if (autoGeneratedPassphrase && !agpFile) {
    throw new NoRSAPassphraseError();
  }

  const mobilePass = 'mobilePass' in params ? params.mobilePass! : recoverAutoGeneratedPassphrase(params, agpFile!);
  const { signingKeys, ncwWalletMasters: masterKeys } = parseMetadataFile(metadataFile.getData().toString());

  if (params.recoverOnlyNCW) {
    let walletMaster: WalletMaster | undefined;
    if (Object.keys(masterKeys).length > 0) {
      walletMaster = recoverNCWMaster(zipFiles, forge.pki.decryptRsaPrivateKey(rsaFileData, params.rsaPass), masterKeys);
    }

    return { xpub: '', fpub: '', ncwWalletMaster: walletMaster };
  }

  const players = recoverKeysShares(zipFiles, signingKeys, mobilePass, rsaFileData, params.rsaPass);

  for (const keyId in signingKeys) {
    if (!Object.keys(players).includes(keyId)) {
      throw new KeyIdMissingError(keyId);
    }
  }

  const privateKeysTemp: CalculatedPrivateKey | undefined = reconstructKeys(players, signingKeys);
  if (!privateKeysTemp) {
    throw new Error('Mismatch between recovered keys and metadata - unable to continue');
  }
  const privateKeys = privateKeysTemp!;

  const keyAlgorithms: Algorithm[] = Object.keys(privateKeys) as Algorithm[];
  let ecdsa: Algorithm;
  let eddsa: Algorithm;
  if (keyAlgorithms.includes('MPC_ECDSA_SECP256K1') || keyAlgorithms.includes('MPC_CMP_ECDSA_SECP256K1')) {
    ecdsa = keyAlgorithms.includes('MPC_ECDSA_SECP256K1') ? 'MPC_ECDSA_SECP256K1' : 'MPC_CMP_ECDSA_SECP256K1';
  }
  if (keyAlgorithms.includes('MPC_EDDSA_ED25519') || keyAlgorithms.includes('MPC_CMP_EDDSA_ED25519')) {
    eddsa = keyAlgorithms.includes('MPC_EDDSA_ED25519') ? 'MPC_EDDSA_ED25519' : 'MPC_CMP_EDDSA_ED25519';
  }

  const keys = {
    xpub: privateKeys[ecdsa!]!.pubKey,
    xprv: privateKeys[ecdsa!] ? privateKeys[ecdsa!]!.prvKey : undefined,
    chainCodeEcdsa: privateKeys[ecdsa!]!.chainCode ?? undefined,
  } as RecoveredKeys;

  if (privateKeys[eddsa!]) {
    keys.fpub = privateKeys[eddsa!]!.pubKey;
    keys.fprv = privateKeys[eddsa!]!.prvKey ?? undefined;
    keys.chainCodeEddsa = privateKeys[eddsa!]!.chainCode ?? undefined;
  }

  if (!params.recoveryPrv) {
    delete keys.xprv;
    delete keys.fprv;
  }

  let walletMaster: WalletMaster | undefined;
  if (Object.keys(masterKeys).length > 0) {
    walletMaster = recoverNCWMaster(zipFiles, forge.pki.decryptRsaPrivateKey(rsaFileData, params.rsaPass), masterKeys);
  }

  return { ...keys, ncwWalletMaster: walletMaster };
};
