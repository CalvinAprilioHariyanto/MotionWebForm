const DB_NAME = 'annotation-records-db'
const DB_VERSION = 1

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' })
      }

      if (!database.objectStoreNames.contains('summaries')) {
        database.createObjectStore('summaries', { keyPath: 'summaryId' })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function getSetting(key, fallback = '') {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('settings', 'readonly')
    const store = transaction.objectStore('settings')
    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result?.value ?? fallback)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function saveSetting(key, value) {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('settings', 'readwrite')
    const store = transaction.objectStore('settings')
    const request = store.put({ key, value })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function listSummaries() {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('summaries', 'readonly')
    const store = transaction.objectStore('summaries')
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function saveSummary(summary) {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('summaries', 'readwrite')
    const store = transaction.objectStore('summaries')
    const payload = {
      ...summary,
      updatedAt: new Date().toISOString(),
      createdAt: summary.createdAt || new Date().toISOString(),
    }

    const request = store.put(payload)

    request.onsuccess = () => resolve(payload)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteSummary(summaryId) {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction('summaries', 'readwrite')
    const store = transaction.objectStore('summaries')
    const request = store.delete(summaryId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
