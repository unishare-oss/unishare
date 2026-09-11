import { defineConfig } from 'orval'

export default defineConfig({
  unishare: {
    input: {
      target: './openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/lib/api/generated',
      client: 'react-query',
      httpClient: 'fetch',
      override: {
        mutator: {
          path: './src/lib/api/fetcher.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
          useInfinite: true,
          useInfiniteQueryParam: 'page',
        },
        operations: {
          ChatController_getMessages: {
            query: { useInfiniteQueryParam: 'cursor' },
          },
          ChatController_getLinkPreview: {
            query: { useInfinite: false },
          },
          ChatController_getPresence: {
            query: { useInfinite: false },
          },
          TagsController_autocomplete: {
            query: { useInfinite: false },
          },
          ExamsController_findAll: {
            query: { useInfinite: false },
          },
          // Takes a `format` param but is not a list: the generated infinite variant
          // assumes a `page` param and does not compile without this.
          DecksController_getDownloadUrl: {
            query: { useInfinite: false },
          },
          // Same, for the share-token equivalents. Neither is a list, so an infinite
          // variant is dead code that invites someone to page a single object.
          DecksController_getSharedDeck: {
            query: { useInfinite: false },
          },
          DecksController_getSharedDownloadUrl: {
            query: { useInfinite: false },
          },
        },
      },
    },
  },
})
