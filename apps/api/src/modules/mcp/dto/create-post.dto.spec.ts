import { createPostSchema } from './create-post.dto'

const createInput = {
  title: 'Data Structures Lecture 1',
  description: 'Introduction',
  type: 'NOTE' as const,
  courseId: 'course-1',
}

const file = {
  fileName: 'notes.pdf',
  mimeType: 'application/pdf',
  key: 'posts/user-1/notes.pdf',
  size: 2048,
}

describe('createPostSchema summary', () => {
  it.each([undefined, '', '   '])('requires a summary with files (%s)', (summary) => {
    const result = createPostSchema.safeParse({
      ...createInput,
      files: [file],
      ...(summary !== undefined && { summary }),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => /write a summary/i.test(issue.message))).toBe(true)
    }
  })

  it('allows no summary when no files are attached', () => {
    expect(createPostSchema.safeParse(createInput).success).toBe(true)
  })

  it('limits the trimmed summary to 2000 characters', () => {
    expect(
      createPostSchema.safeParse({ ...createInput, files: [file], summary: 'x'.repeat(2001) })
        .success,
    ).toBe(false)
  })

  it('normalizes only bullet markers followed by a space, including indented lines', () => {
    const result = createPostSchema.parse({
      ...createInput,
      summary: 'Intro\n  - first\n\t* second\n**Bold**\n-5°C\n',
    })

    expect(result.summary).toBe('Intro\n• first\n• second\n**Bold**\n-5°C')
  })

  it('describes the summary requirements to MCP clients', () => {
    expect(createPostSchema.shape.summary.description).toMatch(
      /required when files are attached.*AI-written.*3–6.*•.*under 2000 characters/i,
    )
  })
})
