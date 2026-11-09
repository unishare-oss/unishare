import { GUEST_READ_ONLY } from '@/common/decorators/guest-read-only.decorator'
import { PostsController } from '@/modules/posts/posts.controller'
import { CommentsController } from '@/modules/posts/comments/comments.controller'
import { FilesController } from '@/modules/files/files.controller'
import { ReportsController } from '@/modules/reports/reports.controller'
import { QuizzesController } from '@/modules/quizzes/quizzes.controller'
import { PostRequestsController } from '@/modules/post-requests/post-requests.controller'
import { CoursesController } from '@/modules/courses/courses.controller'
import { DecksController } from '@/modules/decks/decks.controller'
import { ReadingListsController } from '@/modules/reading-lists/reading-lists.controller'
import { TagsController } from '@/modules/tags/tags.controller'
import { ExamsController } from '@/modules/exams/exams.controller'
import { StorageController } from '@/modules/storage/storage.controller'
import { ChatController } from '@/modules/chat/chat.controller'
import { FollowsController } from '@/modules/follows/follows.controller'

jest.mock('./auth.config', () => ({ auth: {} }))

// The guard reads route metadata, so the URL's spelling (case, prefixes) no longer matters by
// construction; what matters is that every content controller carries the marker.
describe('content controllers are read-only for guests', () => {
  it.each([
    PostsController,
    CommentsController,
    FilesController,
    ReportsController,
    QuizzesController,
    PostRequestsController,
    CoursesController,
    DecksController,
    ReadingListsController,
    TagsController,
    ExamsController,
    // Not content, but guests are read-only there too: no chatting or following.
    ChatController,
    FollowsController,
  ])('%p carries @GuestReadOnly()', (controller) => {
    expect(Reflect.getMetadata(GUEST_READ_ONLY, controller)).toBe(true)
  })

  it('storage: the multipart (post attachment) routes are marked; presigned uploads check in the handler, since guests may attach to canvas boards', () => {
    const proto = StorageController.prototype as unknown as Record<string, object>
    for (const name of [
      'createMultipartUpload',
      'uploadPart',
      'completeMultipartUpload',
      'abortMultipartUpload',
    ]) {
      expect(Reflect.getMetadata(GUEST_READ_ONLY, proto[name])).toBe(true)
    }
    expect(Reflect.getMetadata(GUEST_READ_ONLY, StorageController)).toBeUndefined()
    expect(Reflect.getMetadata(GUEST_READ_ONLY, proto.getPresignedUploadUrl)).toBeUndefined()
  })
})
