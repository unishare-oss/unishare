let counter = 0
export const nanoid = (size?: number): string => {
  counter++
  const base = `mock${counter}`
  const len = size ?? 21
  return base.padEnd(len, '0').slice(0, len)
}
