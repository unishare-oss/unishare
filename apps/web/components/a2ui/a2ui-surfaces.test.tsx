import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('wraps surfaces in the themed container that maps A2UI variables to app tokens', async () => {
    const { container } = render(<A2uiSurfaces messages={[create, components, data]} />)
    await screen.findByText('Option A')

    expect(container.querySelector('.a2ui-themed')).not.toBeNull()
  })

  it('applies messages that arrive after the first render', async () => {
    const { rerender } = render(<A2uiSurfaces messages={[create, components]} />)
    expect(await screen.findByText('Option A')).toBeTruthy()

    rerender(<A2uiSurfaces messages={[create, components, data]} />)
    expect(await screen.findByText('What is an eigenvalue?')).toBeTruthy()
  })

  it('shows surface text as text, with no link or markup', async () => {
    const withLink: A2uiMessage = {
      version: '1.0',
      updateComponents: {
        surfaceId: 'quiz',
        components: [
          { id: 'root', component: 'Text', text: 'See [the notes](https://evil.example) **now**' },
        ],
      },
    }
    const { container } = render(<A2uiSurfaces messages={[create, withLink]} />)

    expect(await screen.findByText(/the notes/)).toBeTruthy()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('strong')).toBeNull()
  })

  it('hands a pressed button to onAction with the surface data model', async () => {
    const withButton: A2uiMessage = {
      version: '1.0',
      updateComponents: {
        surfaceId: 'quiz',
        components: [
          { id: 'root', component: 'Column', children: ['go', 'result'] },
          {
            id: 'go',
            component: 'Button',
            child: 'go_label',
            action: { event: { name: 'check', context: { index: 2 } } },
          },
          { id: 'go_label', component: 'Text', text: 'Go' },
          { id: 'result', component: 'Text', text: { '@path': '/result' } },
        ],
      },
    }
    const seen: unknown[] = []
    render(
      <A2uiSurfaces
        messages={[
          create,
          withButton,
          {
            version: '1.0',
            updateDataModel: { surfaceId: 'quiz', path: '/', value: { picked: ['1'], result: '' } },
          },
        ]}
        onAction={(action, dataModel) => {
          seen.push(action.name, action.context, dataModel.get('/picked'))
          dataModel.set('/result', 'Well done')
        }}
      />,
    )

    fireEvent.click(await screen.findByRole('button'))

    await waitFor(() => expect(seen).toEqual(['check', { index: 2 }, ['1']]))
    expect(await screen.findByText('Well done')).toBeTruthy()
  })
})
