# Flutter Mobile App

Future mobile client for Unishare — cross-platform iOS & Android app consuming the existing NestJS backend. No new API needed; the mobile app is purely a new client surface.

---

## Scope (v1)

Focus on core content consumption and account features. Chat, E2E encryption, and real-time notifications are **out of scope** for v1.

| Feature                | Description                             |
| ---------------------- | --------------------------------------- |
| Auth                   | Register, login, logout via Better Auth |
| Feed                   | Browse published posts (paginated)      |
| Post detail            | View post content, attachments, tags    |
| Upload                 | Create a new post with file attachment  |
| Search                 | Search posts by keyword, tag, course    |
| Profile                | View & edit own profile                 |
| Universities & Courses | Browse department/course structure      |
| Reading list           | Save posts for later                    |
| Trending(maybe not)    | View trending posts                     |

---

## Tech Stack

| Layer            | Choice                           | Why                                                     |
| ---------------- | -------------------------------- | ------------------------------------------------------- |
| Framework        | **Flutter 3 / Dart**             | Single codebase for iOS + Android                       |
| State management | **Riverpod**                     | Scales well, compile-safe, no `BuildContext` dependency |
| HTTP client      | **Dio**                          | Interceptors for auth cookies, easy error handling      |
| API types        | **Retrofit + openapi-generator** | Auto-generate from existing `openapi.json`              |
| Auth session     | **flutter_secure_storage**       | Persist session cookie securely                         |
| Local cache      | **Hive**                         | Lightweight offline cache for feed                      |
| Navigation       | **GoRouter**                     | Declarative, supports deep links                        |
| Image loading    | **cached_network_image**         | Cached remote images                                    |
| File picker      | **file_picker**                  | Upload attachments                                      |

---

## Project Structure

```
apps/mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart                  # GoRouter setup, providers
│   ├── core/
│   │   ├── api/                  # Dio client, interceptors
│   │   ├── auth/                 # Session management
│   │   └── storage/              # Secure storage helpers
│   ├── features/
│   │   ├── auth/                 # Login, register screens
│   │   ├── feed/                 # Home feed
│   │   ├── post/                 # Post detail, create post
│   │   ├── search/               # Search screen
│   │   ├── profile/              # User profile
│   │   └── reading_list/         # Saved posts
│   └── shared/
│       ├── widgets/              # Reusable UI components
│       └── models/               # Generated API models
├── pubspec.yaml
└── openapi.json                  # Symlink or copy from apps/web/openapi.json
```

---

## API Integration

The backend OpenAPI spec lives at `apps/web/openapi.json`. Use it to generate a typed Dart client:

```bash
# From apps/mobile/
openapi-generator-cli generate \
  -i ../web/openapi.json \
  -g dart-dio \
  -o lib/shared/api
```

Re-run this whenever the API changes (same pattern as `pnpm api:sync` on the web side).

### Auth

There is no Flutter SDK for Better Auth — but it's just HTTP. Call the endpoints directly with Dio.

Better Auth uses **cookie-based sessions** (`Set-Cookie` header, not a JWT body). You must persist cookies across requests:

```dart
// pubspec.yaml deps: dio, dio_cookie_manager, cookie_jar
final dio = Dio(BaseOptions(baseUrl: 'https://your-api.com'));
final cookieJar = PersistCookieJar();
dio.interceptors.add(CookieManager(cookieJar));
```

**Endpoints:**

| Action      | Method | Path                      | Body                        |
| ----------- | ------ | ------------------------- | --------------------------- |
| Sign up     | POST   | `/api/auth/sign-up/email` | `{ email, password, name }` |
| Sign in     | POST   | `/api/auth/sign-in/email` | `{ email, password }`       |
| Sign out    | POST   | `/api/auth/sign-out`      | —                           |
| Get session | GET    | `/api/auth/get-session`   | —                           |

After a successful sign-in the session cookie is stored automatically. All subsequent Dio requests will include it — no manual token handling needed.

**Social login (Google / Microsoft):**

Use `flutter_web_auth_2` — it opens a system browser sheet and catches the redirect via deep link.

```dart
// 1. Get the OAuth redirect URL from the backend
final res = await dio.post('/api/auth/sign-in/social', data: {
  'provider': 'google',          // or 'microsoft'
  'callbackURL': 'myapp://auth', // your deep link scheme
});
final authUrl = res.data['url'];

// 2. Open browser and wait for redirect
final result = await FlutterWebAuth2.authenticate(
  url: authUrl,
  callbackUrlScheme: 'myapp',
);

// 3. Session cookie is set automatically after redirect — user is logged in
```

Register the deep link scheme in `AndroidManifest.xml` and `Info.plist`. No separate Google SDK needed.

---

## Getting Started

```bash
cd apps/mobile
flutter pub get
flutter run
```

Set the API base URL in `lib/core/api/client.dart`:

```dart
const apiBaseUrl = 'http://localhost:3001'; // dev
// const apiBaseUrl = 'https://your-domain.com'; // prod
```

---

## Out of Scope (v1)

- Real-time chat (Socket.io)
- Push notifications
- E2E encryption
- Admin panel
- Collab / quizzes

These can be added in future versions once the core is stable.
