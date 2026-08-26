# TerraGuard — working agreements

Instructions for anyone writing code in this repo, human or AI assistant. This file is the
agent-readable form of [CONTRIBUTING.md](CONTRIBUTING.md); the two say the same thing, and
CONTRIBUTING.md is the fuller explanation if you want the reasoning in prose.

Most coding assistants pick this file up automatically (Claude Code, Codex, Cursor, Copilot,
Gemini CLI, Windsurf, Aider and others read `AGENTS.md` or a pointer to it). If yours doesn't,
paste it in or point your tool at it — the rules are plain Markdown and don't depend on any
particular product.

**Before handing work back, run the checker:**

```bash
bash scripts/check-conventions.sh
```

It catches the mechanical violations — branch name, commit prefixes, file naming, `.env`
tracking, hardcoded-looking secrets — and exits non-zero with what to fix. It's plain bash, so a
human, an agent, or CI can all run it.

[DIRECTORY.md](DIRECTORY.md) maps what currently lives where — read it if you're unsure which
module a file belongs to. When working inside `frontend/`, also read
[frontend/AGENTS.md](frontend/AGENTS.md) for notes about this Next.js version.

Large parts of this repo predate these rules (for example `frontend/src/components/` is still
flat rather than feature-grouped). The working default: **new code follows the rules; existing
code is restructured only when someone asks for it.** If a rule and the surrounding code
disagree, say so rather than silently picking one.

---

## Where files go

Group by feature, not by file type, so everything one feature needs sits together:

```
frontend/src/
├── features/
│   └── dashboard/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
└── shared/          # only things genuinely used by 2+ features
    ├── components/  # Button.tsx, Input.tsx
    ├── hooks/
    └── utils/
```

Frontend and backend are separate top-level modules. The Next.js app lives in `frontend/`
(`src/`, plus the Python serverless routes in `frontend/api/`), and the core analysis code lives
in `backend/` (with its tests in `backend/tests/`). The routes in `frontend/api/` are the only
place that imports from `backend/` — that's the seam, and it's what lets the analysis code run
and be tested without Next.js in the way. Don't reach across it anywhere else.

Before creating a new file, find the feature folder it belongs to. Reaching for `shared/` because
you can't decide usually means the file belongs to one feature.

## Naming

**Python** (`backend/`, `frontend/api/`)

| Element | Casing | Example |
| :--- | :--- | :--- |
| Variables | snake_case | `project_name` |
| Constants | SCREAMING_SNAKE_CASE | `MIN_COUNT` |
| Functions & methods | snake_case | `def get_satellite_data()` |
| Modules & files | snake_case | `change_point.py` |
| Classes | PascalCase | `DataAnalyzer` |

**Next.js / React** (`frontend/src/`)

| Element | Casing | Example |
| :--- | :--- | :--- |
| Variables | camelCase | `projectName` |
| Constants | SCREAMING_SNAKE_CASE | `MIN_COUNT` |
| Functions | camelCase | `function fetchData()` |
| Components (and their files) | PascalCase | `SingleLookup.tsx` |
| Classes | PascalCase | `UserClass` |
| Hooks & utilities | camelCase | `useAuth.ts` |

**Database**, if it comes up: tables are plural snake_case (`projects`), columns snake_case
(`project_name`), keys are `<table>_id` (`user_id`).

Booleans read as questions — they start with `is`, `has`, or `should`: `isActive`, `hasAccess`,
`shouldFetch`. A boolean named `active` or `loading` can't be told apart from a state string by
the next reader.

## Separation of concerns

Data fetching belongs in a custom hook, not inside the component. A component that fetches its own
data ends up owning loading flags, race conditions between overlapping requests, and unmount
cleanup, all tangled into the markup — and none of it is reusable or testable on its own.

Bad — the component is doing two jobs:

```tsx
function Dashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyze")
      .then(res => res.json())
      .then(result => { setData(result); setIsLoading(false); });
  }, []);

  if (isLoading) return <p>Loading...</p>;
  return <div>{data}</div>;
}
```

Good — fetching lives in `useAnalysisData.ts`, and `Dashboard` only renders:

```tsx
export function useAnalysisData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyze")
      .then(res => res.json())
      .then(result => { setData(result); setIsLoading(false); });
  }, []);

  return { data, isLoading };
}
```

```tsx
function Dashboard() {
  const { data, isLoading } = useAnalysisData();

  if (isLoading) return <p>Loading...</p>;
  return <div>{data}</div>;
}
```

The same instinct applies in Python: keep fetching (`sar_fetch.py`, `optical_fetch.py`), analysis
(`change_point.py`, `analyze.py`), and the HTTP layer (`frontend/api/*.py`) in separate modules.

## Keys and environment

Never hardcode a key, token, service-account path, or endpoint. Read it from an environment
variable so dev, staging, and production can differ without a code change — and so a leaked key
is a rotation, not a history rewrite. Names are UPPERCASE with underscores:
`NEXT_PUBLIC_API_URL`, `GEE_SERVICE_ACCOUNT_KEY`.

`.env` stays in `.gitignore`. If a real key shows up in a diff, stop and raise it before anything
is committed — a pushed secret has to be rotated, not just deleted.

## User experience

The app should feel alive rather than inert:

- Modals for actions that need confirmation or focus — analyzing, editing, logging out.
- Never render a blank area. Empty states get an indicator message saying what to do next, e.g.
  "No projects found. Add a new lookup to get started."

## Git workflow

`main` stays stable and deployable. Every task happens on its own branch.

```bash
git checkout main && git pull origin main && git checkout -b feature/<feature-name>
```

Branch prefixes: `feature/` for new functionality, `fix/` for bugs, `chore/` for non-functional
updates like README or config housekeeping.

```bash
git add .
git commit -m "add: login page UI"
git push origin feature/<feature-name>
```

Then open a PR with `main` as the base.

Every commit message starts with one of these prefixes, so the log can be skimmed and released
from:

| Prefix      | For                                     |
| :---------- | :-------------------------------------- |
| `add:`      | a new feature or capability             |
| `fix:`      | a bug or broken behavior                |
| `update:`   | improving something that already exists |
| `refactor:` | restructuring with no behavior change   |
| `delete:`   | removing code, features, or files       |
| `docs:`     | documentation                           |
| `test:`     | tests                                   |
| `chore:`    | maintenance                             |
| `config:`   | configuration files                     |

If `main` moved while you were working, rebase rather than merge so history stays linear:

```bash
git checkout main && git pull origin main && git checkout <your-branch> && git rebase main
```

## Before handing work back

Run `bash scripts/check-conventions.sh`, then eyeball what a script can't judge: is the new file
in the right feature folder, is fetching out of the component, do booleans read as questions, does
every empty state say something. Report violations you found and fixed, and if you broke a rule on
purpose because the surrounding code required it, say which rule and why — silent exceptions are
how conventions rot.
