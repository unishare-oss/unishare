# Unishare — Platform Build Phases

An open-source academic content sharing platform for university students.
Designed to be self-hosted and configurable for any university.

---

## Phase 1 — Core Loop

> Goal: A student can upload a file and another student can find and download it.

- [x] Email/password sign-up with confirm password
- [x] OAuth login — Google and Microsoft Entra ID
- [x] Restrict sign-up to a configured university email domain (e.g. `@university.edu`)
- [x] Pull user's name and avatar from OAuth token automatically
- [x] User profile — name, department, year, profile image
- [x] Upload a file (PDF, DOCX) linked to a course and department
- [x] Browse and filter posts by department, course, and file type
- [x] Download a file
- [x] Admin post moderation — approve or reject submitted posts

---

## Phase 2 — Engagement & Discovery

> Goal: Make content useful and engaging. Build community around shared resources.

- [x] Reactions on posts (emoji reactions)
- [x] Comments on posts
- [x] Bookmarks — save posts to revisit later
- [x] View counter on posts
- [x] In-app notifications with unread badge
- [x] Filter persistence across navigation (Zustand)
- [x] Department and course management (admin)
- [x] Admin analytics dashboard — overview stats, top posts, top users

---

## Phase 3 — Search & Growth

> Goal: Make content findable at scale. Only build this once real students are using Phase 1 & 2.

- [ ] Full-text search across post titles and descriptions
- [ ] Trending / popular sort on feed (by reactions or views)
- [ ] Tagging system for better discoverability
- [x] Shareable links for individual posts
- [ ] Report / flag content
- [x] User profiles showing post history and activity (partial)

---

## Backlog (Phase 4+)

- Email notifications
- Download counts
- Anonymous posting option
- Bulk moderation tools
- Public API for third-party integrations
