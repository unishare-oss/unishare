import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcYearLevel(enrollmentYear: number, academicYear: number): number {
  return Math.max(1, academicYear - enrollmentYear + 1)
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

export type SnippetLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'python'
  | 'go'
  | 'java'
  | 'rust'
  | 'sql'
  | 'bash'
  | 'yaml'
  | 'markdown'
  | 'json'
  | 'text'

export function getSnippetExt(language: SnippetLanguage) {
  switch (language) {
    case 'typescript':
      return 'ts'
    case 'tsx':
      return 'tsx'
    case 'javascript':
      return 'js'
    case 'jsx':
      return 'jsx'
    case 'python':
      return 'py'
    case 'go':
      return 'go'
    case 'java':
      return 'java'
    case 'rust':
      return 'rs'
    case 'sql':
      return 'sql'
    case 'bash':
      return 'sh'
    case 'yaml':
      return 'yml'
    case 'markdown':
      return 'md'
    case 'json':
      return 'json'
    default:
      return 'txt'
  }
}

export function getSnippetMimeType(language: SnippetLanguage) {
  if (language === 'markdown') return 'text/markdown'
  if (language === 'json') return 'application/json'
  return 'text/plain'
}
