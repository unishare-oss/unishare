import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

// jsdom lacks these; Radix Select calls them when opening.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

function Demo({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Select defaultValue="b" onValueChange={onValueChange}>
      <SelectTrigger aria-label="Module" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Alpha</SelectItem>
        <SelectItem value="b">Beta</SelectItem>
        <SelectItem value="c">Gamma</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe('Select', () => {
  it('opens the demo-style list and picks a value', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Demo onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox', { name: 'Module' })
    expect(trigger).toHaveTextContent('Beta')
    expect(trigger).toHaveAttribute('data-size', 'sm')

    await user.click(trigger)
    const list = await screen.findByRole('listbox')
    const options = within(list).getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('option', { name: 'Gamma' }))
    expect(onValueChange).toHaveBeenCalledWith('c')
    expect(screen.getByRole('combobox', { name: 'Module' })).toHaveTextContent('Gamma')
  })

  it('SelectTrigger carries data-size for default', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Form">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
      </Select>,
    )
    expect(screen.getByRole('combobox', { name: 'Form' })).toHaveAttribute('data-size', 'default')
  })

  it('no native select in the web app', () => {
    const root = join(__dirname, '../..')
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) {
          if (/<select[\s>]/.test(readFileSync(path, 'utf8'))) hits.push(path)
        }
      }
    }
    walk(join(root, 'app'))
    walk(join(root, 'components'))
    expect(hits).toEqual([])
  })
})
