import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Scan {
  id: string;
  name: string;
  category: 'doc' | 'id' | 'receipt' | 'book';
  ts: number;
  pages: string[];       // base64 data URIs — processed (enhanced)
  origPages: string[];   // base64 data URIs — original warp without enhancement
  filter: string;
  fav: boolean;
  folder: string;
}

const KEY = 'sv_scans_v1';

async function load(): Promise<Scan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function save(scans: Scan[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(scans));
}

export const db = {
  async all(): Promise<Scan[]> {
    return load();
  },

  async add(scan: Scan): Promise<void> {
    const scans = await load();
    scans.unshift(scan);
    await save(scans);
  },

  async update(id: string, patch: Partial<Scan>): Promise<void> {
    const scans = await load();
    const i = scans.findIndex(s => s.id === id);
    if (i >= 0) { scans[i] = { ...scans[i], ...patch }; await save(scans); }
  },

  async remove(id: string): Promise<void> {
    const scans = await load();
    await save(scans.filter(s => s.id !== id));
  },

  async get(id: string): Promise<Scan | undefined> {
    const scans = await load();
    return scans.find(s => s.id === id);
  },
};

export function newScanId(): string {
  return 'sv_' + Date.now();
}
