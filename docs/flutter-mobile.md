# Flutter Mobile App

Cross-platform iOS & Android app for Unishare — built standalone with Firebase as the backend. Same concept as the web platform (academic content sharing) but Firebase-native. No dependency on the NestJS API for v1.

> **Future:** NestJS/Postgres sync or migration to a single source of truth is a later consideration once the app is stable.

---

## Architecture

```
Flutter app
    ├── Firebase Auth       — authentication
    ├── Firestore           — posts, users, departments, courses
    ├── Firebase Storage    — file & image uploads
    └── FCM                 — push notifications (future)
```

Standalone — no NestJS calls in v1. People can use this app independently to learn and practice the same domain concepts.

---

## Scope (v1)

| Feature                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| Auth                   | Register, login, logout (email + Google OAuth) |
| Feed                   | Browse published posts (paginated)             |
| Post detail            | View post content, attachments, tags           |
| Upload                 | Create a new post with file attachment         |
| Search                 | Search posts by keyword, tag, course           |
| Profile                | View & edit own profile                        |
| Universities & Courses | Browse department/course structure             |
| Reading list           | Save posts for later                           |

Chat, E2E encryption, admin panel, quizzes, and real-time collaboration are **out of scope** for v1.

---

## Tech Stack

| Layer            | Choice                   | Why                                                     |
| ---------------- | ------------------------ | ------------------------------------------------------- |
| Framework        | **Flutter 3 / Dart**     | Single codebase for iOS + Android                       |
| Backend          | **Firebase**             | Auth, Firestore, Storage — full Flutter SDK support     |
| State management | **Riverpod**             | Scales well, compile-safe, no `BuildContext` dependency |
| Navigation       | **GoRouter**             | Declarative, supports deep links                        |
| Image loading    | **cached_network_image** | Cached remote images                                    |
| File picker      | **file_picker**          | Upload attachments                                      |
| Local cache      | **Hive**                 | Lightweight offline storage                             |

---

## Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add Android & iOS apps, download `google-services.json` / `GoogleService-Info.plist`
3. Enable **Authentication** (email/password + Google)
4. Create **Firestore** database (start in test mode, add rules before launch)
5. Enable **Firebase Storage**

```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure (run from apps/mobile/)
flutterfire configure
```

---

## Firestore Data Model

```
users/{userId}
  name, email, photoUrl, universityId, departmentId, createdAt

universities/{universityId}
  name, logoUrl

departments/{departmentId}
  name, universityId

courses/{courseId}
  name, departmentId

posts/{postId}
  title, description, type, tags[], courseId, authorId,
  fileUrl, status (PENDING/PUBLISHED/REJECTED),
  createdAt, updatedAt

readingList/{userId}/saved/{postId}
  savedAt
```

---

## Auth

Firebase Auth handles email/password and Google sign-in natively.

```dart
// Email sign-in
await FirebaseAuth.instance.signInWithEmailAndPassword(
  email: email,
  password: password,
);

// Google sign-in
final googleUser = await GoogleSignIn().signIn();
final googleAuth = await googleUser!.authentication;
final credential = GoogleAuthProvider.credential(
  accessToken: googleAuth.accessToken,
  idToken: googleAuth.idToken,
);
await FirebaseAuth.instance.signInWithCredential(credential);
```

Use `authStateChanges()` stream to reactively update UI on login/logout.

---

## Project Structure

```
apps/mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart                  # GoRouter setup, Riverpod providers
│   ├── core/
│   │   ├── firebase/             # Firebase init, config
│   │   └── storage/              # Hive local cache helpers
│   ├── features/
│   │   ├── auth/                 # Login, register screens + providers
│   │   ├── feed/                 # Home feed
│   │   ├── post/                 # Post detail, create post
│   │   ├── search/               # Search screen
│   │   ├── profile/              # User profile
│   │   └── reading_list/         # Saved posts
│   └── shared/
│       ├── widgets/              # Reusable UI components
│       └── models/               # Dart model classes (mirrors Firestore docs)
├── pubspec.yaml
├── google-services.json          # Android (gitignored)
└── GoogleService-Info.plist      # iOS (gitignored)
```

---

## Getting Started

```bash
cd apps/mobile
flutter pub get
flutterfire configure   # links to your Firebase project
flutter run
```

---

## Key pubspec.yaml Dependencies

```yaml
dependencies:
  firebase_core: latest
  firebase_auth: latest
  cloud_firestore: latest
  firebase_storage: latest
  google_sign_in: latest
  flutter_riverpod: latest
  go_router: latest
  cached_network_image: latest
  file_picker: latest
  hive_flutter: latest
```

---

## Future Considerations

- **FCM push notifications** — add `firebase_messaging`, store token on user doc
- **Cloud Functions** — scheduled digests, post moderation triggers
- **NestJS sync** — mirror Firestore data to Postgres (or vice versa) for unified platform
- **Single source of truth** — migrate to one DB once both apps are stable
