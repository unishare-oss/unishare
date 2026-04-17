# Upcoming Features

## Flashcard Decks

Create manual or AI-generated flashcard decks from post content.

**Scope**

- Create a deck manually (add cards one by one)
- Generate a deck from a post using AI (extract key terms/definitions)
- Flip-card study UI with keyboard navigation
- Attach decks to posts or courses

**What needs building**

- Prisma models: `Deck`, `Card`
- API module: `decks/` (CRUD + AI generation endpoint)
- Frontend: deck builder, study mode (flip UI)

---

## Go CLI (`unishare-cli`)

A standalone Go CLI for power users to interact with Unishare from the terminal.

**Commands**

- `unishare login` — authenticate and store API key
- `unishare upload <file> --course <code> --type <note|past-paper|assignment>`
- `unishare list [--course <code>] [--department <name>]`
- `unishare search <query>`
- `unishare whoami`

**Stack**

- [`cobra`](https://github.com/spf13/cobra) — command structure
- [`viper`](https://github.com/spf13/viper) — config (`~/.unishare/config.yaml`)
- [`bubbletea`](https://github.com/charmbracelet/bubbletea) — interactive prompts and spinners

**Distribution**

- GitHub Releases with prebuilt binaries (Linux / macOS / Windows)
- `go install github.com/unishare-oss/unishare-cli@latest`
- Homebrew tap (optional)

**Platform changes needed**

- `POST /auth/api-keys` — generate a personal API key (Better Auth supports this)
- Everything else (upload, list, search) already exists
