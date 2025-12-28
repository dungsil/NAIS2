import { StateStorage } from 'zustand/middleware'
// Since I cannot install packages, I will implement a minimal wrapper similar to idb-keyval logic
// or I can implement a raw IndexedDB wrapper.
// Given constraints, raw IndexedDB is safer as strict dependency rules apply.

const DB_NAME = 'nais2-db'
const STORE_NAME = 'keyval'

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
        }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
})

export const indexedDBStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.get(name)
            request.onsuccess = () => resolve(request.result as string || null)
            request.onerror = () => reject(request.error)
        })
    },
    setItem: async (name: string, value: string): Promise<void> => {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.put(value, name)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    },
    removeItem: async (name: string): Promise<void> => {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.delete(name)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    },
}
