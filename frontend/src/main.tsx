import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"

import { ApiError } from "./client"
import { CustomProvider } from "./components/ui/provider"
import { toaster } from "./components/ui/toaster"
import { clearAuthToken, configureApiClient } from "./lib/api/client"
import { queryPersister } from "./lib/queryPersister"

// Configure API client
configureApiClient()

// Initialize i18n
import i18n from "./i18n"

const handleApiError = (error: Error) => {
  if (error instanceof ApiError && error.status === 401) {
    // Only redirect to login for non-Canvas API 401 errors
    // Canvas API 401s should be handled at the component level
    const isCanvasApiCall = error.url?.includes("/canvas") || false

    if (!isCanvasApiCall) {
      // Show user-friendly notification before redirect
      toaster.create({
        title: i18n.t("errors.sessionExpired", { ns: "common" }),
        description: i18n.t("errors.sessionExpiredDescription", {
          ns: "common",
        }),
        type: "warning",
      })

      // Delay redirect slightly to show toast
      setTimeout(() => {
        clearAuthToken()
        router.navigate({ to: "/login", search: { error: undefined } })
      }, 1000)
    }
    // Canvas 401s will bubble up to component level for graceful handling
  }
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache quiz data for 10 minutes to reduce API calls
      staleTime: 10 * 60 * 1000, // 10 minutes
      // Keep cached data for 30 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime)
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Keep previous data while fetching new data
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: 60 * 60 * 1000, // 1 hour max persistence
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Only persist coverage queries (expensive to compute)
              const key = query.queryKey
              return Array.isArray(key) && key.includes("coverage")
            },
          },
        }}
      >
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </CustomProvider>
  </StrictMode>,
)
