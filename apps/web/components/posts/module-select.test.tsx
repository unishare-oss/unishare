import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ModuleSelect } from './module-select'

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

describe('ModuleSelect', () => {
  it('offers modules 1 to 20', async () => {
    render(
      <>
        <label htmlFor="m">Module</label>
        <ModuleSelect id="m" value="" onChange={() => {}} />
      </>,
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'Module' }))
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(20)
    expect(options[0]).toHaveTextContent('Module 1')
    expect(options[19]).toHaveTextContent('Module 20')
  })

  it('forwards props such as aria-invalid to the trigger', () => {
    render(<ModuleSelect value="" onChange={() => {}} aria-invalid aria-describedby="err" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAttribute('aria-describedby', 'err')
  })
})
