import { Injectable } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { NotificationType, PostStatus } from '@/generated/prisma/client'
import { NotificationsRepository } from './notifications.repository'

interface SseEvent {
  userId: string
  data: object
}

@Injectable()
export class NotificationsService {
  private readonly events$ = new Subject<SseEvent>()

  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  streamForUser(userId: string): Observable<MessageEvent> {
    return this.events$.pipe(
      filter((e) => e.userId === userId),
      map((e) => ({ data: e.data }) as MessageEvent),
    )
  }

  async notifyPostStatus(
    postId: string,
    authorId: string,
    status: PostStatus,
    postTitle?: string | null,
  ) {
    if (status !== PostStatus.APPROVED && status !== PostStatus.REJECTED) return

    const type =
      status === PostStatus.APPROVED
        ? NotificationType.POST_APPROVED
        : NotificationType.POST_REJECTED
    const title = postTitle ? `"${postTitle}"` : 'Your post'
    const message =
      status === PostStatus.APPROVED
        ? `${title} has been approved and is now visible to everyone.`
        : `${title} was not approved by a moderator.`

    const notification = await this.notificationsRepository.create({
      userId: authorId,
      type,
      message,
      postId,
    })
    this.events$.next({ userId: authorId, data: notification })
  }

  async notifyComment(
    postId: string,
    postAuthorId: string,
    commenterId: string,
    postTitle?: string | null,
    commenterName?: string,
  ) {
    if (postAuthorId === commenterId) return

    const who = commenterName ?? 'Someone'
    const title = postTitle ? `"${postTitle}"` : 'your post'
    const notification = await this.notificationsRepository.create({
      userId: postAuthorId,
      type: NotificationType.COMMENT_ADDED,
      message: `${who} commented on ${title}.`,
      postId,
    })
    this.events$.next({ userId: postAuthorId, data: notification })
  }

  findByUser(userId: string) {
    return this.notificationsRepository.findByUser(userId)
  }

  async markAllRead(userId: string) {
    await this.notificationsRepository.markAllRead(userId)
  }

  countUnread(userId: string) {
    return this.notificationsRepository.countUnread(userId)
  }
}
