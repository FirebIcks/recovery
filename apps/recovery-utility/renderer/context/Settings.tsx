import { createContext, useContext, useEffect, ReactNode } from 'react';
import { z } from 'zod';
import { getLogger, settingsInput, useWrappedState } from '@fireblocks/recovery-shared';
import { LOGGER_NAME_UTILITY } from '@fireblocks/recovery-shared/constants';
import { restoreSettings as ipcRestoreSettings, saveSettings as ipcSaveSettings } from '../lib/ipc';

type Settings = z.infer<typeof settingsInput>;

interface ISettingsContext extends Settings {
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
}

const defaultValue: ISettingsContext = {
  relayBaseUrl: '',
  idleMinutes: 10,
  useProtobuf: true,
  saveSettings: async () => undefined,
};

export const defaultSettings = defaultValue;

const Context = createContext(defaultValue);

const logger = getLogger(LOGGER_NAME_UTILITY);

type Props = {
  children: ReactNode;
};

export const SettingsProvider = ({ children }: Props) => {
  const [settings, setSettings] = useWrappedState<Settings>('util-settings', defaultValue);

  useEffect(() => {
    ipcRestoreSettings().then((data) => setSettings((prev) => ({ ...prev, ...data })));
  }, []);

  const saveSettings = async (data: Partial<Settings>) => {
    logger.debug('Saving settings via IPC', data);
    await ipcSaveSettings(data);

    setSettings((prev) => ({ ...prev, ...data }));
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value: ISettingsContext = {
    ...settings,
    saveSettings,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useSettings = () => useContext(Context);
