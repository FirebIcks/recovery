import { useRouter } from 'next/router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { recoverKeysInput, TextField, Button, UploadWell, BaseModal } from '@fireblocks/recovery-shared';
import { Checkbox, FormControlLabel, Typography, Box, Grid } from '@mui/material';
import { readFileToBase64 } from '@fireblocks/recovery-shared/lib/readFile';
import { useWorkspace } from '../../context/Workspace';
import { recoverExtendedKeys } from '../../lib/recoverExtendedKeys';

type FormData = z.infer<typeof recoverKeysInput>;

type Props = {
  verifyOnly?: boolean;
};

export const RecoveryForm = ({ verifyOnly }: Props) => {
  const router = useRouter();

  const { setExtendedKeys, addAccount } = useWorkspace();

  const [recoveryError, setRecoveryError] = useState<string | undefined>(undefined);
  const [recoveryData, setRecoveryData] = useState<FormData | undefined>(undefined);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState<boolean>(false);

  const recoverMutation = useMutation({
    mutationFn: async (formData: FormData) =>
      recoverExtendedKeys({
        zip: formData.backupZip,
        mobilePassphrase: formData.autoGeneratedPass ? formData.agpRsaPassphrase : formData.passphrase,
        rsaKey: formData.rsaKey,
        rsaKeyPassphrase: formData.rsaKeyPassphrase,
        autoGeneratedPassphrase: formData.autoGeneratedPass,
        mobileRsa: formData.agpRsaKey,
        dangerouslyRecoverPrivateKeys: !verifyOnly,
      }),
    onSuccess: async ({ xpub, fpub, xprv, fprv }) => {
      setRecoveryError(undefined);

      const maskedExtendedKeys = {
        xpub,
        fpub,
        ...(verifyOnly ? {} : { xprv, fprv }),
      };

      setExtendedKeys(maskedExtendedKeys);

      addAccount('Default', 0);

      if (verifyOnly) {
        router.push({ pathname: '/keys', query: { verifyOnly: 'true' } });
      } else {
        router.push('/accounts/vault');
      }
    },
    onError: (error) => {
      console.error(error);

      setRecoveryError(error instanceof Error ? error.message : (error as string));
    },
  });

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(recoverKeysInput),
    defaultValues: {
      backupZip: '',
      rsaKey: '',
      passphrase: '',
      rsaKeyPassphrase: '',
      agpRsaKey: '',
      agpRsaPassphrase: '',
    },
  });

  const [backupZip, rsaKey, agpRsaKey, autoGeneratedPass] = watch(['backupZip', 'rsaKey', 'agpRsaKey', 'autoGeneratedPass']);

  const onDropBackupZip = async (file: File) => setValue('backupZip', await readFileToBase64(file));

  const onDropRsaPrivateKey = async (file: File) => setValue('rsaKey', await readFileToBase64(file));

  const onDropAGPRsaPrivateKey = async (file: File) => setValue('agpRsaKey', await readFileToBase64(file));

  const onSubmit = (formData: FormData) => (verifyOnly ? recoverMutation.mutate(formData) : setRecoveryData(formData));

  const onConfirmRecover = () => recoverMutation.mutate(recoveryData as FormData);

  return (
    <>
      <Box
        component='form'
        height='100%'
        display='flex'
        flexDirection='column'
        onSubmit={handleSubmit(onSubmit)}
        onKeyUp={(event) => {
          if (event.shiftKey === false && event.key === 'Enter') {
            handleSubmit(onSubmit);
          }
        }}
      >
        <Typography variant='h1'>{verifyOnly ? 'Verify Recovery Kit' : 'Recover Private Keys'}</Typography>
        {verifyOnly ? (
          <Typography variant='body1' paragraph>
            Use this tool to recover your Fireblocks extended public keys, then check that they match the keys in your Fireblocks
            Console Settings. Derive wallet public keys to check that their addresses match. This does not expose your private
            keys.
          </Typography>
        ) : (
          <Typography variant='body1' color={(theme) => theme.palette.error.main} paragraph>
            Using private key recovery exposes your private keys to this system. Only do this in a disaster recovery scenario, and
            then move your assets to other secure wallets. Use the Fireblocks Console, APIs, and SDKs for standard operations.
          </Typography>
        )}
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <UploadWell
              label='Recovery Kit'
              error={errors.backupZip?.message}
              hasFile={!!backupZip}
              accept={{ 'application/zip': ['.zip'] }}
              disabled={recoverMutation.isLoading}
              onDrop={onDropBackupZip}
            />
          </Grid>
          <Grid item xs={6}>
            <UploadWell
              label='Recovery Private Key'
              error={errors.rsaKey?.message}
              hasFile={!!rsaKey}
              accept={{ 'application/x-pem-file': ['.key', '.pem'] }}
              disabled={recoverMutation.isLoading}
              onDrop={onDropRsaPrivateKey}
            />
          </Grid>
          <Grid item xs={6}>
            {autoGeneratedPass ? (
              <TextField
                id='agpRsaKeyPassphrase'
                type='password'
                label='Auto-generated passphrase'
                error={errors.agpRsaPassphrase?.message}
                disabled={recoverMutation.isLoading}
                {...register('agpRsaPassphrase')}
              />
            ) : (
              <TextField
                id='passphrase'
                type='password'
                label='Mobile App Recovery Passphrase'
                helpText='Set by the workspace owner during onboarding'
                error={errors.passphrase?.message}
                disabled={recoverMutation.isLoading}
                {...register('passphrase')}
              />
            )}
          </Grid>
          <Grid item xs={6}>
            <TextField
              id='rsaKeyPassphrase'
              type='password'
              label='Recovery Private Key Passphrase'
              error={errors.rsaKeyPassphrase?.message}
              disabled={recoverMutation.isLoading}
              {...register('rsaKeyPassphrase')}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel
              control={<Checkbox id='autoGeneratedPass' {...register('autoGeneratedPass')} />}
              label='Use auto-generated passphrase'
            />
          </Grid>
          <Grid item xs={6}>
            <UploadWell
              label='Auto-generated passphrase private key'
              error={errors.agpRsaKey?.message}
              hasFile={!!agpRsaKey}
              accept={{ 'application/x-pem-file': ['.key', '.pem'] }}
              disabled={recoverMutation.isLoading}
              hidden={!autoGeneratedPass}
              onDrop={onDropAGPRsaPrivateKey}
            />
          </Grid>
        </Grid>
        <Grid container spacing={2} alignItems='center' justifyContent='flex-end' marginTop='auto'>
          <Grid item flex='1'>
            <Typography variant='body1' fontWeight='600' color={(theme) => theme.palette.error.main}>
              {recoveryError}
            </Typography>
          </Grid>
          <Grid item>
            <Button type='submit' color='primary' disabled={recoverMutation.isLoading}>
              {verifyOnly ? 'Verify Recovery Kit' : 'Recover'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      <BaseModal
        open={!!recoveryData && !verifyOnly}
        actions={
          <>
            <FormControlLabel
              style={{ paddingRight: '39%' }}
              control={<Checkbox onChange={(_, checked) => setRecoveryConfirmed(!recoveryConfirmed)} />}
              label='I want to recover my private key'
            />
            <Button
              color='primary'
              disabled={!recoveryConfirmed}
              onClick={() => {
                onConfirmRecover();
                setRecoveryData(undefined);
                setRecoveryConfirmed(false);
              }}
            >
              Confirm
            </Button>
          </>
        }
        title='Confirm Recovery'
        onClose={() => setRecoveryData(undefined)}
      >
        <Typography variant='body1' color={(theme) => theme.palette.error.main}>
          You are about to recover the workspace private key materials. This means that for the first time since their creation,
          the private keys will be reconstructed in a single location.
          <br />
          <br />
          Recovering will allow you to withdraw your assets. If you are only interested in verifying, please use the verify
          operation instead.
          <br />
          <br />
          Please confirm you would like to reconstruct the private keys.
        </Typography>
      </BaseModal>
    </>
  );
};
