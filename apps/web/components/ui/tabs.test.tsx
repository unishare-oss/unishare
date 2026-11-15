import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

function Demo({ variant }: { variant?: 'default' | 'line' }) {
  return (
    <Tabs defaultValue="a">
      <TabsList variant={variant}>
        <TabsTrigger value="a">One</TabsTrigger>
        <TabsTrigger value="b">Two</TabsTrigger>
        <TabsTrigger value="c">Three</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel one</TabsContent>
      <TabsContent value="b">Panel two</TabsContent>
      <TabsContent value="c">Panel three</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('renders underline tabs', async () => {
    render(<Demo />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)

    const second = screen.getByRole('tab', { name: 'Two' })
    await userEvent.click(second)
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Panel two')).toBeVisible()
    second.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus()
  })

  it('default and line variants render the same underline style', () => {
    const { unmount } = render(<Demo />)
    const defaultStyle = screen.getByRole('tablist').getAttribute('data-variant')
    const defaultClass = screen.getByRole('tablist').className
    unmount()
    render(<Demo variant="line" />)
    expect(screen.getByRole('tablist')).toHaveAttribute('data-variant', defaultStyle!)
    expect(screen.getByRole('tablist').className).toBe(defaultClass)
  })
})
