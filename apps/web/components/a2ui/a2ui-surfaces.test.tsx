import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1'
import { A2uiSurfaces, type A2uiMessage } from '@/components/a2ui/a2ui-surfaces'

const create: A2uiMessage = {
  version: '1.0',
  createSurface: { surfaceId: 'quiz', catalogId: basicCatalog.id },
}

const components: A2uiMessage = {
  version: '1.0',
  updateComponents: {
    surfaceId: 'quiz',
    components: [
      { id: 'root', component: 'Column', children: ['question', 'answer'] },
      { id: 'question', component: 'Text', text: { '@path': '/question' } },
      { id: 'answer', component: 'Text', text: 'Option A' },
    ],
  },
}

const data: A2uiMessage = {
  version: '1.0',
  updateDataModel: {
    surfaceId: 'quiz',
    path: '/',
    value: { question: 'What is an eigenvalue?' },
  },
}

describe('A2uiSurfaces', () => {
  it('draws a surface from createSurface, updateComponents and updateDataModel', async () => {
    render(<A2uiSurfaces messages={[create, components, data]} />)

    expect(await screen.findByText('What is an eigenvalue?')).toBeTruthy()
    expect(screen.getByText('Option A')).toBeTruthy()
  })

  it('applies messages that arrive after the first render', async () => {
    const { rerender } = render(<A2uiSurfaces messages={[create, components]} />)
    expect(await screen.findByText('Option A')).toBeTruthy()

    rerender(<A2uiSurfaces messages={[create, components, data]} />)
    expect(await screen.findByText('What is an eigenvalue?')).toBeTruthy()
  })
})
