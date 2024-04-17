import Store from 'electron-store';

export type Settings = {
  relayBaseUrl: string;
  idleMinutes: number;
  useProtobuf: boolean;
};

export class SettingsStore {
  private static _keys = ['relayBaseUrl', 'useProtobuf', 'idleMinutes'] as const;

  private static _store = new Store<Settings>({
    name: 'settings',
    /** only for obfuscation */
    // encryptionKey: 'VmYq3t6v9y$B&E)H@McQfTjWnZr4u7x!',
    defaults: {
      relayBaseUrl: 'https://localhost:3000',
      idleMinutes: 10,
      useProtobuf: true,
    },
  });

  public static get(): Settings {
    const settings = SettingsStore._keys.reduce((acc, key) => ({ ...acc, [key]: SettingsStore._store.get(key) }), {} as Settings);

    return settings;
  }

  public static set(data: Partial<Settings>) {
    const newSettings = { ...data };
    const settings = this.get();
    // eslint-disable-next-line no-restricted-syntax
    for (const settingKey of Object.keys(settings)) {
      if (!(settingKey in newSettings)) newSettings[settingKey] = settings[settingKey];
    }

    SettingsStore._keys.forEach((key) => SettingsStore._store.set(key, newSettings[key]));
  }

  public static reset() {
    SettingsStore._store.clear();
  }
}
