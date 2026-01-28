/**
 * Query cache persister for localStorage.
 * Used to persist coverage queries across page refreshes.
 */

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"

export const queryPersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "QUIZCRAFTER_QUERY_CACHE",
})
