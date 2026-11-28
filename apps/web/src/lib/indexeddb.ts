const DB_NAME = 'unishare-crypto'
const STORE_NAME = 'keys'

/** Fired on `window` after this device's private key is stored or cleared. */
export const PRIVATE_KEY_CHANGED_EVENT = 'unishare:private-key-changed'

function notifyPrivateKeyChanged() {
  window.dispatchEvent(new Event(PRIVATE_KEY_CHANGED_EVENT))
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function storePrivateKey(key: CryptoKey, userId: string): Promise<void> {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(key, userId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }).then(notifyPrivateKeyChanged)
}

export async function getPrivateKey(userId: string): Promise<CryptoKey | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(userId)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearPrivateKey(userId: string): Promise<void> {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(userId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }).then(notifyPrivateKeyChanged)
}
