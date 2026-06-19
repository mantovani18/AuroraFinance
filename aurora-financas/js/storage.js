/* =========================================================
   storage.js
   Camada única de persistência local do Aurora Finanças.
   Usa IndexedDB como banco principal; se indisponível,
   cai automaticamente para localStorage (mesma API).
   Nenhum dado sai do dispositivo do usuário.
   ========================================================= */

const AuroraStorage = (() => {
  const DB_NAME = "aurora-financas-db";
  const DB_VERSION = 1;
  const STORES = ["transactions", "tasks", "goals", "habits", "events", "notes", "flashcards", "studyplan", "settings"];

  let db = null;
  let useFallback = false;

  /* ---------- inicialização ---------- */
  function init() {
    return new Promise((resolve) => {
      if (!("indexedDB" in window)) {
        useFallback = true;
        resolve(false);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const _db = e.target.result;
          STORES.forEach((store) => {
            if (!_db.objectStoreNames.contains(store)) {
              _db.createObjectStore(store, { keyPath: "id" });
            }
          });
        };

        req.onsuccess = (e) => {
          db = e.target.result;
          resolve(true);
        };

        req.onerror = () => {
          useFallback = true;
          resolve(false);
        };
      } catch (err) {
        useFallback = true;
        resolve(false);
      }
    });
  }

  /* ---------- helpers de localStorage (fallback) ---------- */
  function lsKey(store) {
    return `aurora:${store}`;
  }
  function lsGetAll(store) {
    try {
      return JSON.parse(localStorage.getItem(lsKey(store))) || [];
    } catch {
      return [];
    }
  }
  function lsSetAll(store, arr) {
    localStorage.setItem(lsKey(store), JSON.stringify(arr));
  }

  /* ---------- API genérica ---------- */
  function getAll(store) {
    return new Promise((resolve) => {
      if (useFallback || !db) {
        resolve(lsGetAll(store));
        return;
      }
      try {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(lsGetAll(store));
      } catch {
        resolve(lsGetAll(store));
      }
    });
  }

  function put(store, item) {
    return new Promise((resolve) => {
      if (!item.id) item.id = generateId();
      if (useFallback || !db) {
        const all = lsGetAll(store);
        const idx = all.findIndex((i) => i.id === item.id);
        if (idx >= 0) all[idx] = item;
        else all.push(item);
        lsSetAll(store, all);
        resolve(item);
        return;
      }
      try {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(item);
        tx.oncomplete = () => resolve(item);
        tx.onerror = () => resolve(item);
      } catch {
        resolve(item);
      }
    });
  }

  function remove(store, id) {
    return new Promise((resolve) => {
      if (useFallback || !db) {
        const all = lsGetAll(store).filter((i) => i.id !== id);
        lsSetAll(store, all);
        resolve(true);
        return;
      }
      try {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  function clearAll() {
    return new Promise((resolve) => {
      if (useFallback || !db) {
        STORES.forEach((s) => localStorage.removeItem(lsKey(s)));
        resolve(true);
        return;
      }
      try {
        const tx = db.transaction(STORES, "readwrite");
        STORES.forEach((s) => tx.objectStore(s).clear());
        tx.oncomplete = () => {
          STORES.forEach((s) => localStorage.removeItem(lsKey(s)));
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  function generateId() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  /* ---------- chave-valor simples para configurações ---------- */
  async function getSetting(key, defaultValue = null) {
    const all = await getAll("settings");
    const found = all.find((s) => s.id === key);
    return found ? found.value : defaultValue;
  }
  async function setSetting(key, value) {
    return put("settings", { id: key, value });
  }

  return {
    init,
    getAll,
    put,
    remove,
    clearAll,
    generateId,
    getSetting,
    setSetting,
    STORES,
  };
})();
