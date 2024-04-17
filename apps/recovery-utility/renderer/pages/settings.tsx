import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  TextField,
  QrCode,
  settingsInput,
  theme,
  monospaceFontFamily,
  getLogger,
  useWrappedState,
} from '@fireblocks/recovery-shared';
import { Box, Checkbox, FormControlLabel, Grid, Typography } from '@mui/material';
import walletDerivationPackage from '@fireblocks/wallet-derivation/package.json';
import extendedKeyRecoveryPackage from '@fireblocks/extended-key-recovery/package.json';
import { LOGGER_NAME_UTILITY } from '@fireblocks/recovery-shared/constants';
import { shell } from 'electron';
import { useEffect } from 'react';
import utilityPackage from '../../package.json';
import { useSettings, defaultSettings } from '../context/Settings';
import { useWorkspace } from '../context/Workspace';
import { getLogsPath as ipcGetLogsPath } from '../lib/ipc';

type FormData = z.infer<typeof settingsInput>;

const RELAY_SOURCE_URL = 'github.com/fireblocks/recovery';

const logger = getLogger(LOGGER_NAME_UTILITY);

const Settings = () => {
  const { idleMinutes, relayBaseUrl, useProtobuf, saveSettings } = useSettings();

  const [idleMinutesSetting, setIdleMinutesSettings] = useWrappedState<number>('settings-idleMinutes', idleMinutes);
  const [relayBaseUrlSetting, setRelayBaseUrlSettings] = useWrappedState<string>('settings-relayBaseUrl', relayBaseUrl);
  const [useProtobufSetting, setUseProtobufSettings] = useWrappedState<boolean>('settings-useProtobuf', useProtobuf);

  const { reset: resetWorkspace } = useWorkspace();

  const {
    register,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(settingsInput),
    defaultValues: {
      idleMinutes,
      relayBaseUrl,
      useProtobuf,
    },
  });

  const useEffectFn = (variable: 'idleMinutes' | 'relayBaseUrl') => () => {
    setTimeout(async () => {
      if (errors[variable]?.message) {
        return;
      }

      await saveSettings({ [variable]: variable === 'idleMinutes' ? idleMinutesSetting : relayBaseUrlSetting });
    }, 0);
  };

  useEffect(useEffectFn('idleMinutes'), [idleMinutesSetting]);
  useEffect(useEffectFn('relayBaseUrl'), [relayBaseUrlSetting]);
  useEffect(() => {
    (async () => {
      await saveSettings({ useProtobuf: useProtobufSetting });
    })();
  }, [useProtobufSetting]);

  const downloadLogs = async () => shell.openPath(await ipcGetLogsPath());

  return (
    <Box component='form' display='flex' height='100%' flexDirection='column'>
      <Typography variant='h1'>Settings</Typography>
      <Grid container spacing={2} paddingBottom='1rem'>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant='h2'>Reset</Typography>
              <Button type='submit' size='large' variant='outlined' fullWidth color='error' onClick={resetWorkspace}>
                Reset Workspace & Keys
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Typography variant='h2'>Auto Reset (minutes)</Typography>
              <TextField
                id='idleMinutes'
                type='number'
                placeholder={defaultSettings.idleMinutes.toString()}
                helpText='Resets when this system is inactive.'
                error={errors.idleMinutes?.message}
                value={idleMinutesSetting}
                // {...register('idleMinutes', { valueAsNumber: true })}
                onChange={(event) => {
                  console.log('Idle minutes:', event.target.value);
                  setIdleMinutesSettings(parseInt(event.target.value, 10));
                }}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h2'>Recovery Relay</Typography>
          <Grid container spacing={2}>
            <Grid item xs={9}>
              <TextField
                id='relayBaseUrl'
                type='url'
                label='Base URL'
                value={relayBaseUrlSetting}
                placeholder={defaultSettings.relayBaseUrl}
                helpText='You can host your own Recovery Relay. See source at github.com/fireblocks/recovery. DO NOT USE RELAY URLS FROM UNTRUSTED PARTIES!'
                error={errors.relayBaseUrl?.message}
                {...register('relayBaseUrl')}
                onChange={(event) => {
                  console.log('Relay base url:', event.target.value);
                  setRelayBaseUrlSettings(event.target.value);
                }}
              />
            </Grid>
            <Grid item xs={3}>
              <Typography fontWeight='500' color={(t) => t.palette.grey[900]} marginBottom='0.25rem'>
                Source Code
              </Typography>
              <QrCode
                data={`https://${RELAY_SOURCE_URL}`}
                showRawData={false}
                width='100%'
                bgColor={theme.palette.background.paper}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <Grid container xs={12}>
            <Grid container xs={4}>
              <Grid item direction='column'>
                <Typography variant='h2'>Logs</Typography>
                <Button type='submit' size='large' variant='outlined' fullWidth color='primary' onClick={downloadLogs}>
                  Show Logs
                </Button>
              </Grid>
            </Grid>
            <Grid container xs={8}>
              <Grid item direction='column'>
                <Typography variant='h2'>QR Generation</Typography>
                <FormControlLabel
                  control={<Checkbox onChange={(_, checked) => setUseProtobufSettings(checked)} checked={useProtobufSetting} />}
                  label='Should use protobuf instead of jsoncrush as QR content generation'
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Typography variant='h2'>Updates</Typography>
          <Grid container spacing={2}>
            <Grid item xs={9}>
              <Typography variant='body1' paragraph>
                Recovery Utility is for air-gapped devices and should be manually updated from the Fireblocks Help Center at
                support.fireblocks.io or {`${RELAY_SOURCE_URL}/releases`}.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant='caption' paragraph>
                    Recovery Utility<Typography fontFamily={monospaceFontFamily}>{utilityPackage.version}</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='caption' paragraph>
                    Wallet Derivation<Typography fontFamily={monospaceFontFamily}>{walletDerivationPackage.version}</Typography>
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='caption' paragraph>
                    Extended Key Recovery
                    <Typography fontFamily={monospaceFontFamily}>{extendedKeyRecoveryPackage.version}</Typography>
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={3}>
              <Typography fontWeight='500' color={(t) => t.palette.grey[900]} marginBottom='0.25rem'>
                Latest Release
              </Typography>
              <QrCode
                data={`https://${RELAY_SOURCE_URL}/releases`}
                showRawData={false}
                width='100%'
                bgColor={theme.palette.background.paper}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
