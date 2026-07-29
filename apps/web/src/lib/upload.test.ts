import { describe, expect, it, vi, afterEach } from 'vitest'
import { putToPresignedUrl, sha256Base64 } from './upload'

describe('sha256Base64', () => {
  it('matches the standard SHA-256 vectors in the base64 form S3 expects', async () => {
    await expect(sha256Base64(new Blob(['abc']))).resolves.toBe(
      'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=',
    )
    await expect(sha256Base64(new Blob([]))).resolves.toBe(
      '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    )
  })

  it('produces 44 base64 characters and survives high bytes intact', async () => {
    const bytes = new Uint8Array(512)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256
    const digest = await sha256Base64(new Blob([bytes]))
    expect(digest).toMatch(/^[A-Za-z0-9+/]{43}=$/)
  })

  it('gives different digests for bodies differing by one byte', async () => {
    const [a, b] = await Promise.all([
      sha256Base64(new Blob(['payload-a'])),
      sha256Base64(new Blob(['payload-b'])),
    ])
    expect(a).not.toBe(b)
  })
})

describe('putToPresignedUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('resolves on a 2xx and sends the body as-is', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const body = new Blob(['file bytes'])
    await expect(
      putToPresignedUrl('https://s3.example/obj', body, 'text/plain'),
    ).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith('https://s3.example/obj', {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'text/plain' },
    })
  })

  it('throws with the S3 error code so a rejected upload cannot pass silently', async () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidDigest</Code>' +
      '<Message>Failed to validate checksum for algorithm Sha256</Message></Error>'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(xml, { status: 400 })))

    await expect(
      putToPresignedUrl('https://s3.example/obj', new Blob(['x']), 'text/plain'),
    ).rejects.toThrow('Upload failed (400: InvalidDigest)')
  })

  it('still throws when the error body is unreadable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))

    await expect(
      putToPresignedUrl('https://s3.example/obj', new Blob(['x']), 'text/plain'),
    ).rejects.toThrow('Upload failed (403)')
  })
})
