# Content Reporting & Moderation Workflows for Phase 3

**Project:** Unishare (Academic Content Sharing)
**Phase:** 3 (Search & Growth)
**Researched:** January 2025
**Confidence:** HIGH

## Executive Summary

For Unishare's content reporting system, **implement a tiered review workflow with automated pattern detection** because:

1. Academic platforms need clear rules (plagiarism, copyright, harassment)
2. Most reports are legitimate; fast processing improves trust
3. Automated pattern detection flags repeat offenders without manual review
4. Moderators need clear dashboards; escalation paths prevent burnout
5. Appeals process maintains fairness; community trust is essential

**Key insight:** Moderation isn't just about removing bad content—it's about maintaining community norms and protecting students from harm.

---

## Recommended Model: Tiered Reporting System

### Database Schema

```prisma
model ContentReport {
  id            String          @id @default(cuid())
  postId        String
  reportedBy    String
  reason        ReportReason
  description   String?
  status        ReportStatus    @default(PENDING)
  severity      ReportSeverity  @default(LOW)
  priority      Int             @default(0)  // For sorting
  createdAt     DateTime        @default(now())
  resolvedAt    DateTime?
  resolvedBy    String?         // Admin who handled it

  post          Post            @relation(fields: [postId], references: [id], onDelete: Cascade)
  reporter      User            @relation("ReportedBy", fields: [reportedBy], references: [id])
  resolver      User?           @relation("ResolvedBy", fields: [resolvedBy], references: [id])

  action        ContentAction?  // What happened (deleted, warned, dismissed)
  appeal        ContentAppeal?

  @@index([postId])
  @@index([status])
  @@index([severity])
  @@index([createdAt])
  @@unique([postId, reportedBy])  // One report per user per post
  @@map("content_report")
}

model ContentAction {
  id              String         @id @default(cuid())
  reportId        String         @unique
  report          ContentReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)

  action          ActionType
  reason          String?
  postDeleted     Boolean        @default(false)
  authorWarned    Boolean        @default(false)
  authorBanned    Boolean        @default(false)
  banDuration     Int?           // Hours
  createdAt       DateTime       @default(now())

  @@map("content_action")
}

model ContentAppeal {
  id              String         @id @default(cuid())
  reportId        String         @unique
  report          ContentReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)

  appealedBy      String
  reason          String
  status          AppealStatus   @default(PENDING)
  decision        String?        // Admin notes
  decidedBy       String?
  createdAt       DateTime       @default(now())
  decidedAt       DateTime?

  appellant       User           @relation("AppealedBy", fields: [appealedBy], references: [id])
  decider         User?          @relation("AppealDecision", fields: [decidedBy], references: [id])

  @@index([status])
  @@index([reportId])
  @@map("content_appeal")
}

enum ReportReason {
  PLAGIARISM           // Academic dishonesty
  HARMFUL_CONTENT      // Threats, harassment, hate speech
  MISINFORMATION       // False/misleading information
  SPAM                 // Spam, promotional
  COPYRIGHT            // Copyright/licensing violation
  EXPLICIT_CONTENT     // NSFW, inappropriate
  IMPERSONATION        // Pretending to be someone else
  OTHER
}

enum ReportStatus {
  PENDING               // Awaiting review
  IN_REVIEW             // Moderator reviewing
  ACTION_TAKEN          // Resolved (post deleted, author warned, etc)
  DISMISSED             // Report was invalid
  APPEALED              // Author appealed the action
}

enum ReportSeverity {
  LOW                   // Minor issue
  MEDIUM                // Concerning but not urgent
  HIGH                  // Urgent (harassment, explicit)
  CRITICAL              // Immediate action needed (threats, illegal)
}

enum ActionType {
  DELETE_POST           // Post removed from platform
  WARN_AUTHOR           // Warning sent to author
  TEMPORARY_BAN         // User banned (e.g., 24h)
  PERMANENT_BAN         // User permanently banned
  CONTENT_HIDDEN        // Post hidden (but not deleted)
  NO_ACTION             // Reviewed, no violation found
}

enum AppealStatus {
  PENDING               // Awaiting decision
  APPROVED              // Action overturned
  DENIED                // Action upheld
}

// Extend User model:
model User {
  // ... existing fields
  reports                ContentReport[]        @relation("ReportedBy")
  reportedActions        ContentAction[]        @relation("ResolvedBy")
  appealDecisions        ContentAppeal[]        @relation("AppealDecision")
  appeals                ContentAppeal[]        @relation("AppealedBy")

  warningCount           Int                    @default(0)

  @@map("user")
}

// Extend Post model:
model Post {
  // ... existing fields
  reports                ContentReport[]
  contentAction          ContentAction?

  @@map("post")
}
```

---

## Reporting Workflow

### 1. User Reports Content

```typescript
// reports.controller.ts
@Post(':postId/report')
async reportPost(
  @Param('postId') postId: string,
  @Body() dto: CreateReportDto,
  @CurrentUser() user: User,
) {
  // Check post exists
  const post = await this.prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) throw new NotFoundException();

  // Check user hasn't already reported this post
  const existing = await this.prisma.contentReport.findUnique({
    where: { postId_reportedBy: { postId, reportedBy: user.id } },
  });

  if (existing) {
    throw new BadRequestException('You have already reported this post');
  }

  // Create report
  const report = await this.prisma.contentReport.create({
    data: {
      postId,
      reportedBy: user.id,
      reason: dto.reason,
      description: dto.description,
      severity: this.calculateSeverity(dto.reason),
    },
  });

  // Auto-escalate severe reports
  if (report.severity === 'CRITICAL') {
    await this.flagForImmediateReview(report);
  }

  return report;
}
```

### 2. Auto-Classification & Pattern Detection

```typescript
// moderation.service.ts
async analyzeReport(report: ContentReport) {
  const post = await this.prisma.post.findUnique({
    where: { id: report.postId },
    include: { author: true },
  });

  // Pattern detection
  const authorReportCount = await this.prisma.contentReport.count({
    where: {
      post: { authorId: post.authorId },
      status: { not: 'DISMISSED' },
    },
  });

  // If same author has 3+ reports, flag for urgent review
  if (authorReportCount >= 3) {
    report.severity = 'HIGH';
    report.priority = 10;
  }

  // Keyword detection (plagiarism, spam patterns)
  const keywordFlags = this.detectSpamKeywords(post.title + ' ' + (post.description || ''));
  if (keywordFlags.length > 0) {
    report.severity = 'MEDIUM';
    report.priority = 5;
  }

  // Update severity
  await this.prisma.contentReport.update({
    where: { id: report.id },
    data: {
      severity: report.severity,
      priority: report.priority,
      status: 'IN_REVIEW',
    },
  });

  return report;
}

private detectSpamKeywords(text: string): string[] {
  const spamPatterns = [
    /buy\s+(?:fake|cheap)\s+(?:degrees|papers|solutions)/gi,
    /(?:click|buy|order|visit)\s+(?:now|here|today)/gi,
    /[a-z0-9._%+-]+@[a-z0-9.-]+/gi,  // Multiple emails
  ];

  return spamPatterns
    .filter(pattern => pattern.test(text))
    .map(p => p.source);
}
```

### 3. Moderator Review & Decision

```typescript
// moderation.controller.ts (Admin only)
@Get('reports')
@UseGuards(AdminGuard)
async getReportQueue(@Query('status') status?: ReportStatus) {
  return this.prisma.contentReport.findMany({
    where: { status: status || 'PENDING' },
    include: {
      post: { include: { author: true } },
      reporter: { select: { name: true, email: true } },
      action: true,
    },
    orderBy: [
      { priority: 'desc' },  // High priority first
      { createdAt: 'asc' },   // Oldest first
    ],
    take: 20,
  });
}

@Post('reports/:reportId/action')
@UseGuards(AdminGuard)
async takeAction(
  @Param('reportId') reportId: string,
  @Body() dto: TakeActionDto,
  @CurrentUser() admin: User,
) {
  const report = await this.prisma.contentReport.findUnique({
    where: { id: reportId },
    include: { post: { include: { author: true } } },
  });

  // Create action record
  const action = await this.prisma.contentAction.create({
    data: {
      reportId,
      action: dto.action,
      reason: dto.reason,
      postDeleted: dto.action === 'DELETE_POST',
      authorWarned: dto.action === 'WARN_AUTHOR',
      authorBanned: ['TEMPORARY_BAN', 'PERMANENT_BAN'].includes(dto.action),
      banDuration: dto.banDuration,
    },
  });

  // Execute action
  switch (dto.action) {
    case 'DELETE_POST':
      await this.prisma.post.update({
        where: { id: report.postId },
        data: { deletedAt: new Date() },
      });
      break;

    case 'WARN_AUTHOR':
      await this.notifyAuthor(report.post.author.id, 'Your post violated guidelines');
      await this.prisma.user.update({
        where: { id: report.post.authorId },
        data: { warningCount: { increment: 1 } },
      });
      break;

    case 'TEMPORARY_BAN':
      const banUntil = new Date(Date.now() + dto.banDuration * 60 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: report.post.authorId },
        data: {
          banned: true,
          banExpires: banUntil,
          banReason: dto.reason,
        },
      });
      break;

    case 'PERMANENT_BAN':
      await this.prisma.user.update({
        where: { id: report.post.authorId },
        data: {
          banned: true,
          banExpires: null,  // Permanent
          banReason: dto.reason,
        },
      });
      break;
  }

  // Update report
  await this.prisma.contentReport.update({
    where: { id: reportId },
    data: {
      status: 'ACTION_TAKEN',
      resolvedAt: new Date(),
      resolvedBy: admin.id,
    },
  });

  // Notify reporter and author
  await this.notifyReporter(reportId, action.action);
  await this.notifyAuthor(report.post.authorId, 'Your post was removed');

  return { report, action };
}
```

---

## Admin Moderation Dashboard

### Real-time Metrics

```typescript
async getModerationStats() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return {
    pending: await this.prisma.contentReport.count({
      where: { status: 'PENDING' },
    }),
    inReview: await this.prisma.contentReport.count({
      where: { status: 'IN_REVIEW' },
    }),
    actionTakenToday: await this.prisma.contentAction.count({
      where: { createdAt: { gte: last24h } },
    }),
    averageResolutionTime: await this.getAvgResolutionTime(),
    topReportReasons: await this.getTopReportReasons(last24h),
    mostReportedAuthors: await this.getMostReportedAuthors(last24h),
  };
}

async getAvgResolutionTime() {
  const resolved = await this.prisma.contentReport.findMany({
    where: { status: 'ACTION_TAKEN', resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true },
  });

  const times = resolved.map(r =>
    (r.resolvedAt!.getTime() - r.createdAt.getTime()) / 1000 / 60  // minutes
  );

  return times.length > 0
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0;
}

async getTopReportReasons(since: Date) {
  const reasons = await this.prisma.contentReport.groupBy({
    by: ['reason'],
    where: { createdAt: { gte: since } },
    _count: { reason: true },
    orderBy: { _count: { reason: 'desc' } },
  });

  return reasons;
}

async getMostReportedAuthors(since: Date) {
  const authors = await this.prisma.contentReport.groupBy({
    by: ['postId'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  // Fetch actual author info
  const posts = await this.prisma.post.findMany({
    where: { id: { in: authors.map(a => a.postId) } },
    include: { author: { select: { name: true, email: true } } },
  });

  return posts.map((p, i) => ({
    author: p.author,
    reportCount: authors[i]._count.id,
  }));
}
```

### Dashboard Filters

```typescript
async getReports(filters: {
  status?: ReportStatus;
  severity?: ReportSeverity;
  reason?: ReportReason;
  resolvedBy?: string;
  from?: Date;
  to?: Date;
}) {
  return this.prisma.contentReport.findMany({
    where: {
      status: filters.status,
      severity: filters.severity,
      reason: filters.reason,
      resolvedBy: filters.resolvedBy,
      createdAt: {
        gte: filters.from,
        lte: filters.to,
      },
    },
    include: {
      post: { include: { author: true } },
      reporter: { select: { name: true } },
      resolver: { select: { name: true } },
      action: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

---

## Appeals Process

### User Appeals Moderation Decision

```typescript
// appeals.controller.ts
@Post('reports/:reportId/appeal')
async appealAction(
  @Param('reportId') reportId: string,
  @Body() dto: AppealDto,
  @CurrentUser() user: User,
) {
  const report = await this.prisma.contentReport.findUnique({
    where: { id: reportId },
  });

  // Only post author can appeal
  if (report.post.authorId !== user.id) {
    throw new ForbiddenException();
  }

  // Can only appeal if action was taken
  if (!report.action) {
    throw new BadRequestException('No action to appeal');
  }

  // Check for existing appeal
  const existing = await this.prisma.contentAppeal.findUnique({
    where: { reportId },
  });

  if (existing && existing.status === 'PENDING') {
    throw new BadRequestException('Appeal already in progress');
  }

  const appeal = await this.prisma.contentAppeal.create({
    data: {
      reportId,
      appealedBy: user.id,
      reason: dto.reason,
    },
  });

  // Flag for review (not auto-approved)
  await this.flagAppealForReview(appeal);

  return appeal;
}
```

### Admin Decides Appeal

```typescript
@Post('appeals/:appealId/decision')
@UseGuards(AdminGuard)
async decideAppeal(
  @Param('appealId') appealId: string,
  @Body() dto: AppealDecisionDto,
  @CurrentUser() admin: User,
) {
  const appeal = await this.prisma.contentAppeal.findUnique({
    where: { id: appealId },
    include: { report: { include: { action: true, post: true } } },
  });

  const decision = dto.approved ? 'APPROVED' : 'DENIED';

  if (decision === 'APPROVED') {
    // Reverse the action
    await this.reverseModerationAction(appeal.report.action!);

    // Restore post if deleted
    if (appeal.report.action!.postDeleted) {
      await this.prisma.post.update({
        where: { id: appeal.report.postId },
        data: { deletedAt: null },
      });
    }

    // Unban author if banned
    if (appeal.report.action!.authorBanned) {
      await this.prisma.user.update({
        where: { id: appeal.report.post.authorId },
        data: { banned: false, banExpires: null },
      });
    }
  }

  await this.prisma.contentAppeal.update({
    where: { id: appealId },
    data: {
      status: decision,
      decision: dto.decision,
      decidedBy: admin.id,
      decidedAt: new Date(),
    },
  });

  // Notify appellant
  await this.notifyAppellant(appeal, decision);

  return appeal;
}
```

---

## Safety Features

### Abuse Prevention

```typescript
// Prevent spam reporting
async canReportPost(userId: string, postId: string): Promise<boolean> {
  // Max 1 report per user per post
  const existing = await this.prisma.contentReport.findUnique({
    where: { postId_reportedBy: { postId, reportedBy: userId } },
  });

  if (existing) return false;

  // Rate limit: max 10 reports per day per user
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await this.prisma.contentReport.count({
    where: {
      reportedBy: userId,
      createdAt: { gte: last24h },
    },
  });

  return count < 10;
}

// Prevent false reports
async trackFalseReports(userId: string) {
  // If user's reports are frequently dismissed, reduce trust score
  const dismissed = await this.prisma.contentReport.count({
    where: {
      reportedBy: userId,
      status: 'DISMISSED',
    },
  });

  const total = await this.prisma.contentReport.count({
    where: { reportedBy: userId },
  });

  const falsePositiveRate = dismissed / total;

  if (falsePositiveRate > 0.5) {
    console.warn(`User ${userId} has ${falsePositiveRate * 100}% false report rate`);
    // Could throttle their reports or require approval
  }
}
```

---

## Implementation Checklist

### Phase 3 (MVP)

- [ ] Add ContentReport, ContentAction, ContentAppeal models
- [ ] Implement report creation endpoint
- [ ] Create admin moderation dashboard (in-review, pending)
- [ ] Implement delete post, warn author, temporary ban actions
- [ ] Add appeal process for authors
- [ ] Admin decision-making interface

### Phase 3.5

- [ ] Auto-classification by severity
- [ ] Spam keyword detection
- [ ] Pattern detection (repeat offenders)
- [ ] Moderation queue analytics

### Phase 4+

- [ ] Machine learning abuse detection
- [ ] Community flagging (users vote on reports)
- [ ] Moderator workload balancing
- [ ] Audit trail of all moderation actions

---

## Moderation Policy Framework

### Clear Guidelines

```markdown
# Content Policy

## Prohibited Content

1. **Plagiarism & Academic Dishonesty**
   - Submitting others' work as your own
   - Purchasing papers or solutions
   - Action: Delete + 24h warning

2. **Harassment & Threats**
   - Targeted harassment of individuals
   - Threats of violence or harm
   - Action: Immediate ban (48h+)

3. **Copyright & Licensing**
   - Copyrighted material without permission
   - Violating author's licensing terms
   - Action: Delete + contact author

4. **Spam**
   - Promotional links or unsolicited advertising
   - Repetitive, irrelevant content
   - Action: Delete + warning

5. **Explicit Content**
   - NSFW, pornographic, or violent imagery
   - Action: Delete + warning

## Appeals Process

Users can appeal moderation decisions within 30 days. Appeals are reviewed by a different moderator.
```

---

## Sources

- Community Moderation Best Practices: https://www.nngroup.com/articles/moderation-community-sites/
- Reddit's Moderation Tools: https://reddit.com/r/modnews/
- GitHub's Community Guidelines: https://docs.github.com/en/site-policy/github-terms/github-community-guidelines
- Trust & Safety at Scale: https://www.trusted.com/ (case studies)
- Prisma Transactions: https://www.prisma.io/docs/concepts/components/prisma-client/transactions
