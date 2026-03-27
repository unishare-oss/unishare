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
        },
      },
    },
  },
})
