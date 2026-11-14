import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { CreatePostFormValues } from '@/lib/posts/form-types'
import { DetailsStep } from './details-step'

vi.mock('@/components/TagInput', () => ({ TagInput: () => <div /> }))

function Harness() {
  const form = useForm<CreatePostFormValues>({
    defaultValues: {
      postType: 'NOTE',
      selectedDept: '',
      selectedCourse: '',
      title: '',
      description: '',
      isAnonymous: false,
      year: '',
      semester: '',
      moduleNum: '',
      examYear: '',
      externalUrl: '',
      files: [],
      tags: [],
    },
  })
  return <DetailsStep form={form} postType="NOTE" />
}

describe('DetailsStep', () => {
  it('uses the module dropdown', () => {
    render(<Harness />)
    expect(screen.getByRole('combobox', { name: /module/i })).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: /module/i })).not.toBeInTheDocument()
  })
})
