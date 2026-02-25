import { defineConfig } from 'orval'

export default defineConfig({
  unishare: {
    input: {
      target: 'http://localhost:3001/api-json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/lib/api/generated',
      client: 'react-query',
      httpClient: 'fetch',
      override: {
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
})
