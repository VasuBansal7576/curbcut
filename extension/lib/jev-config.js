globalThis.CurbCutJevConfig = (() => {
  function access(mode, operation) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open("curbcut-jev", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("options");
      open.onerror = () => reject(new Error("Could not open Jev options."));
      open.onsuccess = () => {
        const database = open.result;
        const transaction = database.transaction("options", mode);
        const request = operation(transaction.objectStore("options"));
        transaction.oncomplete = () => { database.close(); resolve(request.result); };
        transaction.onabort = () => { database.close(); reject(new Error("Could not save Jev options.")); };
      };
    });
  }
  return {
    get: () => access("readonly", store => store.get("key")),
    set: key => access("readwrite", store => key ? store.put(key, "key") : store.delete("key")),
  };
})();
