import { PostsController } from '@/modules/posts/posts.controller'
import { CommentsController } from '@/modules/posts/comments/comments.controller'
import { FilesController } from '@/modules/files/files.controller'
import { QuizzesController } from '@/modules/quizzes/quizzes.controller'
import { PostRequestsController } from '@/modules/post-requests/post-requests.controller'
import { CoursesController } from '@/modules/courses/courses.controller'
import { DecksController } from '@/modules/decks/decks.controller'
import { ReadingListsController } from '@/modules/reading-lists/reading-lists.controller'
import { TagsController } from '@/modules/tags/tags.controller'
import { UsersController } from '@/modules/users/users.controller'
import { UniversitiesController } from '@/modules/universities/universities.controller'
import { DepartmentsController } from '@/modules/departments/departments.controller'
import { FacultiesController } from '@/modules/faculties/faculties.controller'

jest.mock('./auth.config', () => ({ auth: {} }))

// `@OptionalAuth()` / `@AllowAnonymous()` metadata keys read by Better Auth's guard.
const opensToSignedOut = (target: object) =>
  !!Reflect.getMetadata('OPTIONAL', target) || !!Reflect.getMetadata('PUBLIC', target)

type Controller = { prototype: object } & (new (...args: never[]) => unknown)

function signedOutRoutes(controller: Controller) {
  const proto = controller.prototype as Record<string, unknown>
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
    .filter((name) => opensToSignedOut(controller) || opensToSignedOut(proto[name] as object))
}

describe('content routes need a session', () => {
  it.each([
    PostsController,
    CommentsController,
    FilesController,
    QuizzesController,
    PostRequestsController,
    CoursesController,
    ReadingListsController,
    TagsController,
    UsersController,
  ])('%p has no signed-out route, so the auth guard answers 401', (controller) => {
    expect(signedOutRoutes(controller)).toEqual([])
  })

  it('decks: only the ingress check, which answers 401 itself, skips the guard', () => {
    expect(signedOutRoutes(DecksController)).toEqual(['frameAuthorize'])
  })

  it.each([UniversitiesController, DepartmentsController, FacultiesController])(
    '%p listing (the catalogue the guest picker needs) stays public',
    (controller) => {
      expect(signedOutRoutes(controller)).toContain('findAll')
    },
  )
})
