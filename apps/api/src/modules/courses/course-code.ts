export function normalizeCourseCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase()
}
