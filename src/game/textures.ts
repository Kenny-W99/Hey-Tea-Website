import { Assets, Texture } from "pixi.js";
interface Entry {
  users: number;
  load: Promise<Texture>;
  timer?: ReturnType<typeof setTimeout>;
}
const entries = new Map<string, Entry>();
export function leaseTextures(urls: string[]) {
  const owned = urls.map((url) => {
    let entry = entries.get(url);
    if (!entry) {
      entry = { users: 0, load: Assets.load<Texture>(url) };
      entries.set(url, entry);
    }
    clearTimeout(entry.timer);
    entry.users++;
    return { url, entry };
  });
  let released = false;
  return {
    ready: Promise.all(owned.map(({ entry }) => entry.load)),
    release() {
      if (released) return;
      released = true;
      for (const { url, entry } of owned) {
        if (--entry.users > 0) continue;
        entry.timer = setTimeout(() => {
          void entry.load
            .then(() => {
              if (entry.users === 0 && entries.get(url) === entry) {
                entries.delete(url);
                return Assets.unload(url);
              }
            })
            .catch(() => {
              if (entries.get(url) === entry) entries.delete(url);
            });
        }, 500);
      }
    },
  };
}
