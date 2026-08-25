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
        },
      },
    },
  },
})
