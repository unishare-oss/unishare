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

  async notifyRequestSuggestion(
    requestId: string,
    requestAuthorId: string,
    suggesterId: string,
    suggesterName?: string,
    requestTitle?: string,
  ) {
    if (requestAuthorId === suggesterId) return

    const who = suggesterName ?? 'Someone'
    const title = requestTitle ? `"${requestTitle}"` : 'your request'
    const notification = await this.notificationsRepository.create({
      userId: requestAuthorId,
      type: NotificationType.REQUEST_SUGGESTION_ADDED,
      message: `${who} suggested a post to fulfill ${title}.`,
      requestId,
    })
    this.events$.next({ userId: requestAuthorId, data: notification })
  }

  async notifyRequestFulfilled(
    requestId: string,
    suggesterUserId: string,
    requestAuthorId: string,
    requestTitle?: string,
  ) {
    if (suggesterUserId === requestAuthorId) return

    const title = requestTitle ? `"${requestTitle}"` : 'A request'
    const notification = await this.notificationsRepository.create({
      userId: suggesterUserId,
      type: NotificationType.REQUEST_FULFILLED,
      message: `${title} was fulfilled using your suggested post!`,
      requestId,
    })
    this.events$.next({ userId: suggesterUserId, data: notification })
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

  async notifyFollowersNewPost(
    postId: string,
    authorName: string,
    postTitle: string | null | undefined,
    followerIds: string[],
  ) {
    if (followerIds.length === 0) return
    const title = postTitle ? `"${postTitle}"` : 'a new post'
    await Promise.all(
      followerIds.map(async (userId) => {
        const notification = await this.notificationsRepository.create({
          userId,
          type: NotificationType.NEW_POST_FROM_FOLLOWED,
          message: `${authorName} posted ${title}.`,
          postId,
        })
        this.events$.next({ userId, data: notification })
      }),
    )
  }

  async notifyChatMessage(
    chatRoomId: string,
    senderName: string,
    roomName: string | null,
    isDm: boolean,
    recipientIds: string[],
  ) {
    if (recipientIds.length === 0) return

    const message = isDm
      ? `${senderName} sent you a message`
      : `${senderName} sent a message in ${roomName ?? 'a group'}`

    await Promise.all(
      recipientIds.map(async (userId) => {
        const notification = await this.notificationsRepository.create({
          userId,
          type: NotificationType.CHAT_MESSAGE,
          message,
          chatRoomId,
        })
        this.events$.next({ userId, data: notification })
      }),
    )
  }

  async notifyExamReminder(
    examId: string,
    courseCode: string,
    examTitle: string,
    startsAt: Date,
    recipientIds: string[],
  ) {
    if (recipientIds.length === 0) return

    const message = `${courseCode} ${examTitle} is coming up on ${startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`

    await Promise.all(
      recipientIds.map(async (userId) => {
        const notification = await this.notificationsRepository.create({
          userId,
          type: NotificationType.EXAM_REMINDER,
          message,
          examId,
        })
        this.events$.next({ userId, data: notification })
      }),
    )
  }

  findByUser(userId: string) {
    return this.notificationsRepository.findByUser(userId)
  }

  async markOneRead(id: string, userId: string) {
    await this.notificationsRepository.markOneRead(id, userId)
  }

  async markAllRead(userId: string) {
    await this.notificationsRepository.markAllRead(userId)
  }

  countUnread(userId: string) {
    return this.notificationsRepository.countUnread(userId)
  }
}
