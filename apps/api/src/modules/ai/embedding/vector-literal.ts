/** Formats a vector for a pgvector `::vector` cast. Passed as a bound parameter, never interpolated. */
export function toVectorLiteral(vector: number[]): string {
  if (vector.length === 0) throw new Error('Cannot format an empty vector')
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error('Cannot format a vector containing non-finite values')
  }
  return `[${vector.join(',')}]`
}
