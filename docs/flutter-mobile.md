# Flutter Mobile App

Cross-platform iOS, Android & Web app for Unishare — built standalone with Firebase as the backend. Same concept as the web platform (academic content sharing) but Firebase-native. No dependency on the NestJS API for v1.

> **Future:** NestJS/Postgres sync or migration to a single source of truth is a later consideration once the app is stable.

---

## Architecture

```
Flutter app
    ├── Firebase Auth       — authentication (email/password, Google OAuth, biometric fallback)
    ├── Firestore           — posts, users, departments, courses
    ├── Firebase Storage    — file & image uploads
    ├── Firebase Crashlytics — crash reporting and structured logging
    ├── Firebase Remote Config — feature flags
    └── FCM                 — push notifications (future)
```

Standalone — no NestJS calls in v1.

---

## Clean Architecture

All features follow strict layer separation. The Domain layer must have **zero Flutter or Firebase imports**.

```
lib/
  features/<name>/
    data/
      datasources/     ← Firebase/Firestore calls, DTOs
      models/          ← JSON-serializable data models (freezed)
      repositories/    ← implements domain interfaces
    domain/
      entities/        ← pure Dart classes, no framework imports
      repositories/    ← abstract interfaces
      usecases/        ← single-responsibility use case classes
    presentation/
      providers/       ← Riverpod providers (@riverpod code gen)
      screens/         ← GoRouter screen widgets
      widgets/         ← feature-scoped reusable widgets
  shared/
    widgets/           ← app-wide reusable components
    theme/             ← ThemeData, typography, color tokens
  core/
    firebase/          ← Firebase initialization
    storage/           ← Hive setup and helpers
    logging/           ← Crashlytics + structured log wrapper
```

---

## Scope (v1)

| Feature                | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| Auth                   | Register, login, logout (email + Google OAuth + biometric fallback) |
| Feed                   | Browse published posts (paginated)                                  |
| Post detail            | View post content, attachments, tags                                |
| Upload                 | Create a new post with file attachment                              |
| Search                 | Search posts by keyword, tag, course                                |
| Profile                | View & edit own profile                                             |
| Universities & Courses | Browse department/course structure                                  |
| Reading list           | Save posts for later (offline-capable)                              |

Chat, E2E encryption, admin panel, quizzes, and real-time collaboration are **out of scope** for v1.

---

## Tech Stack

| Layer            | Choice                          | Why                                                      |
| ---------------- | ------------------------------- | -------------------------------------------------------- |
| Framework        | **Flutter 3 / Dart**            | Single codebase for iOS, Android, Web                    |
| Backend          | **Firebase**                    | Auth, Firestore, Storage, Crashlytics — full Flutter SDK |
| State management | **Riverpod 2.x** (code gen)     | Compile-safe, no `BuildContext` dependency, testable     |
| Navigation       | **GoRouter**                    | Declarative, auth guards, deep links                     |
| Image loading    | **cached_network_image**        | Cached remote images                                     |
| File picker      | **file_picker**                 | Upload attachments                                       |
| Local cache      | **Hive**                        | Lightweight offline storage for critical data paths      |
| Serialization    | **freezed + json_serializable** | Immutable models, pattern matching                       |
| Logging          | **firebase_crashlytics**        | Crash reporting + non-fatal error capture                |
| Feature flags    | **firebase_remote_config**      | Runtime feature gating with rollback support             |

---

## Authentication & Security

### Firebase Auth flows

```dart
// Email sign-in
await FirebaseAuth.instance.signInWithEmailAndPassword(
  email: email, password: password,
);

// Google sign-in
final googleUser = await GoogleSignIn().signIn();
final googleAuth = await googleUser!.authentication;
await FirebaseAuth.instance.signInWithCredential(
  GoogleAuthProvider.credential(
    accessToken: googleAuth.accessToken,
    idToken: googleAuth.idToken,
  ),
);
```

Use `authStateChanges()` stream + Riverpod `StreamProvider` to reactively guard routes.

### Biometric / Passkey fallback

Use `local_auth` for biometric session resumption. Store the session token in the platform keystore:

- Android: Android Keystore via `flutter_secure_storage`
- iOS/Web: Secure Enclave / WebAuthn via `flutter_secure_storage`

Never store tokens in `SharedPreferences` or plaintext.

### Secret management

- No plaintext API keys or config values in Dart source
- `google-services.json` and `GoogleService-Info.plist` are gitignored
- Sensitive values passed via `--dart-define` at build time
- Runtime toggles via `firebase_remote_config`

---

## Firestore Data Model

```
users/{userId}
  name, email, photoUrl, universityId, departmentId,
  role (student | admin), createdAt

universities/{universityId}
  name, logoUrl

departments/{departmentId}
  name, universityId

courses/{courseId}
  name, departmentId

posts/{postId}
  title, description, type, tags[], courseId, authorId,
  fileUrl, status (PENDING | PUBLISHED | REJECTED),
  createdAt, updatedAt

readingList/{userId}/saved/{postId}
  savedAt
```

### Optimization rules

- Denormalize `authorName` and `authorPhotoUrl` onto post documents (avoid joins on feed queries)
- Composite indexes: `(status, createdAt)` for feed pagination; `(courseId, status)` for course posts
- Sub-collection `readingList/{userId}/saved/` isolates reading list data per user

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() { return request.auth != null; }
    function isOwner(uid) { return request.auth.uid == uid; }
    function isAdmin() { return request.auth.token.role == 'admin'; }

    match /users/{userId} {
      allow read: if isAuth();
      allow write: if isOwner(userId)
        && request.resource.data.diff(resource.data)
            .affectedKeys().hasOnly(['name', 'photoUrl', 'departmentId']);
    }

    match /posts/{postId} {
      allow read: if resource.data.status == 'PUBLISHED' || isOwner(resource.data.authorId);
      allow create: if isAuth()
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.createdAt == request.time;
      allow update: if isAdmin()
        || (isOwner(resource.data.authorId)
            && request.resource.data.diff(resource.data)
                .affectedKeys().hasOnly(['title', 'description', 'tags', 'updatedAt'])
            && request.resource.data.updatedAt == request.time);
      allow delete: if isAdmin();
    }

    match /readingList/{userId}/saved/{postId} {
      allow read, write: if isOwner(userId);
    }
  }
}
```

---

## Offline-First Strategy

Critical data paths (feed, reading list, post detail) must degrade gracefully when offline:

1. **Firestore built-in cache** — enabled by default, handles read offline automatically
2. **Hive local cache** — explicitly store reading list and last-viewed posts for guaranteed offline access
3. **Write queue** — Firestore offline writes are queued and synced on reconnect; no additional work needed for basic mutations

```dart
// Enable offline persistence (call once at app start)
await FirebaseFirestore.instance.settings = const Settings(
  persistenceEnabled: true,
  cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
);
```

---

## Observability

### Crashlytics setup

```dart
// main.dart — catch all Flutter and async errors
FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
PlatformDispatcher.instance.onError = (error, stack) {
  FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
  return true;
};
```

### Structured logging wrapper

```dart
// core/logging/app_logger.dart
class AppLogger {
  static void info(String message, {Map<String, dynamic>? context}) {
    FirebaseCrashlytics.instance.log('[INFO] $message');
    debugPrint('[INFO] $message ${context ?? ''}');
  }

  static void error(String message, Object error, StackTrace stack) {
    FirebaseCrashlytics.instance.recordError(error, stack);
    debugPrint('[ERROR] $message $error');
  }
}
```

Use `AppLogger` throughout — never raw `print()`.

---

## Feature Flags

Gate at least one major feature behind Remote Config:

```dart
// Example: gate the Reading List feature
final remoteConfig = FirebaseRemoteConfig.instance;
await remoteConfig.setDefaults({'reading_list_enabled': false});
await remoteConfig.fetchAndActivate();

final readingListEnabled = remoteConfig.getBool('reading_list_enabled');
```

**Rollback plan:** set `reading_list_enabled = false` in Firebase console — takes effect on next app fetch (default: 1 hour TTL, override to 0 for emergency rollback).

---

## Testing Strategy

| Type        | Scope                          | Target                     |
| ----------- | ------------------------------ | -------------------------- |
| Unit        | Domain use cases, repositories | >80% coverage              |
| Widget      | All screens                    | 100% screens               |
| Golden      | Key UI components              | Store in `test/goldens/`   |
| Integration | Full flows on Android + Web    | Auth, feed, upload, search |

```bash
flutter test --coverage                          # unit + widget
flutter test integration_test/                   # integration (requires device)
genhtml coverage/lcov.info -o coverage/html      # coverage report
```

---

## Accessibility (WCAG 2.2 AA)

- All interactive widgets must have `Semantics` labels or `Tooltip`
- Text contrast ratio: ≥ 4.5:1 normal, ≥ 3:1 large text
- Support `textScaleFactor` — no hardcoded font sizes that break at large text
- Test with TalkBack (Android) and VoiceOver (iOS)

---

## Performance Rules

- No unbounded `ListView` — always `ListView.builder` or `SliverList`
- All remote images through `CachedNetworkImage` with placeholder and error widget
- Compress uploads before sending to Firebase Storage (`flutter_image_compress`)
- Paginate Firestore queries — never fetch unbounded collections

---

## CI/CD

```yaml
# .github/workflows/flutter.yml (minimum)
name: Flutter CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: dart format --set-exit-if-changed .
      - run: flutter analyze --fatal-infos
      - run: flutter test --coverage
```

---

## Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add Android, iOS, and Web apps — download `google-services.json` / `GoogleService-Info.plist`
3. Enable **Authentication** (email/password + Google)
4. Create **Firestore** database, deploy security rules from `firestore.rules`
5. Enable **Firebase Storage**
6. Enable **Crashlytics** and **Remote Config**

```bash
dart pub global activate flutterfire_cli
cd apps/mobile
flutterfire configure
```

---

## Project Structure

```
apps/mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart                      # GoRouter setup, ProviderScope
│   ├── core/
│   │   ├── firebase/                 # Firebase init, Remote Config setup
│   │   ├── storage/                  # Hive init and helpers
│   │   └── logging/                  # AppLogger (Crashlytics wrapper)
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── presentation/
│   │   ├── feed/
│   │   ├── post/
│   │   ├── search/
│   │   ├── profile/
│   │   └── reading_list/
│   └── shared/
│       ├── widgets/
│       └── theme/
├── test/
│   ├── unit/
│   ├── widget/
│   └── goldens/
├── integration_test/
├── firestore.rules
├── pubspec.yaml
├── google-services.json              # gitignored
└── GoogleService-Info.plist          # gitignored
```

---

## Key pubspec.yaml Dependencies

```yaml
dependencies:
  firebase_core: ^3.0.0
  firebase_auth: ^5.0.0
  cloud_firestore: ^5.0.0
  firebase_storage: ^12.0.0
  firebase_crashlytics: ^4.0.0
  firebase_remote_config: ^5.0.0
  google_sign_in: ^6.0.0
  local_auth: ^2.0.0
  flutter_secure_storage: ^9.0.0
  flutter_riverpod: ^2.0.0
  riverpod_annotation: ^2.0.0
  go_router: ^14.0.0
  cached_network_image: ^3.0.0
  file_picker: ^8.0.0
  hive_flutter: ^1.0.0
  freezed_annotation: ^2.0.0
  json_annotation: ^4.0.0
  flutter_image_compress: ^2.0.0

dev_dependencies:
  riverpod_generator: ^2.0.0
  freezed: ^2.0.0
  json_serializable: ^6.0.0
  build_runner: ^2.0.0
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
```

---

## Future Considerations

- **FCM push notifications** — add `firebase_messaging`, store token on user doc
- **Cloud Functions** — post moderation triggers, scheduled digests
- **NestJS sync** — mirror Firestore data to Postgres for unified platform
- **Admin panel** — post approval flow mirroring the web platform
