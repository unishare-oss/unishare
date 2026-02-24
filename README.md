# Unishare

An open-source university platform for students to share notes, past question papers, and academic resources.

Designed to be self-hosted and configurable for any university.

---

## Features

- Upload and share notes, past papers, and academic resources
- Search and filter by course, department, year, and file type
- Tagging system for better discoverability
- Upvotes and shareable resource links
- Configurable authentication — Microsoft Entra ID, Google OAuth, or email domain restriction

## Roadmap

See [`platform-phases.md`](./platform-phases.md) for the full build plan.

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Core loop — upload, browse, download | In Progress |
| Phase 2 | Discovery & sharing — search, filters, upvotes | Planned |

## Self-Hosting

Unishare is built to be deployed by any university. Configure your identity provider and allowed email domain via environment variables — no code changes needed.

```env
AUTH_PROVIDER=microsoft
MICROSOFT_TENANT_ID=your-university-tenant-id
ALLOWED_EMAIL_DOMAIN=university.edu
```

Supported auth providers:
- `microsoft` — Microsoft Entra ID (recommended, covers most universities)
- `google` — Google Workspace
- `email` — Email domain restriction fallback

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request.

## License

MIT
