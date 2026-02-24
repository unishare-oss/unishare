# Unishare — Platform Build Phases

An open-source university platform for students to share notes, past question papers, and academic resources.
Designed to be self-hosted and configurable for any university.

---

## Phase 1 — Core Loop

> Goal: A student can upload a file and another student can find and download it. Ship this and get real users before moving on.

- [ ] Configurable OAuth login (Microsoft Entra ID, Google, or email domain restriction)
- [ ] Microsoft Entra ID as the primary provider (covers most universities on Microsoft 365)
- [ ] Fallback: restrict signup to a configured university email domain (e.g. `@university.edu`)
- [ ] Pull user's name and email from OAuth token automatically
- [ ] Basic user profile (name, department, year)
- [ ] Upload a file (PDF, DOCX) linked to a course
- [ ] Browse and list uploaded resources
- [ ] Download a file

---

## Phase 2 — Discovery & Sharing

> Goal: Make content findable and shareable. Only build this once real students are using Phase 1.

- [ ] Search by keyword, course, or subject
- [ ] Filter by year, department, and file type
- [ ] Tagging system for resources
- [ ] Upvotes on resources
- [ ] Shareable links for individual resources

---

## Backlog (Phase 3+)

- Bookmarks
- Comments on resources
- View and download counts
- Report / flag content
- User profiles showing uploads and activity
- Notifications
- Moderation dashboard
