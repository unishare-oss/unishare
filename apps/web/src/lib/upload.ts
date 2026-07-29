export async function sha256Base64(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  let binary = ''
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function putToPresignedUrl(url: string, body: Blob, mimeType: string): Promise<void> {
  const res = await fetch(url, { method: 'PUT', body, headers: { 'Content-Type': mimeType } })
  if (res.ok) return

  const text = await res.text().catch(() => '')
  const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1]
  throw new Error(`Upload failed (${res.status}${code ? `: ${code}` : ''})`)
}
