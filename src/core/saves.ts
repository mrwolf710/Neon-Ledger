// Save slots in localStorage: [{ id, name, t (ms), data }], newest first. The old single slot (nl.save) is imported once.
export interface SaveSlot { id: number; name: string; t: number; data: unknown; img?: string }
const KEY = 'nl.saves', OLD = 'nl.save';

export function createSaves() {
  let list: SaveSlot[] = [];
  try {
    list = JSON.parse(localStorage.getItem(KEY)!);
    if (!Array.isArray(list)) {
      const old = JSON.parse(localStorage.getItem(OLD)!);
      list = old ? [{ id: 1, name: 'Save 1', t: Date.now(), data: old }] : [];
    }
  } catch { list = []; }
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } };
  const nextId = () => Math.max(0, ...list.map((s) => s.id)) + 1;
  return {
    get list() { return list; },
    latest: () => list.reduce<SaveSlot | null>((a, s) => (!a || s.t > a.t ? s : a), null),
    add(data: unknown, img?: string) { const id = nextId(); list.unshift({ id, name: `Save ${id}`, t: Date.now(), data, img }); return write(); },
    overwrite(id: number, data: unknown, img?: string) { const s = list.find((q) => q.id === id); if (s) { s.data = data; s.t = Date.now(); if (img) s.img = img; } return write(); },
    rename(id: number, name: string) { const s = list.find((q) => q.id === id); if (s && name.trim()) s.name = name.trim().slice(0, 30); return write(); },
    remove(id: number) { list = list.filter((s) => s.id !== id); return write(); },
  };
}
