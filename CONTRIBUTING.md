# Contributing to TerraGuard 🛰️

> Working with an AI coding assistant? The same rules live in [AGENTS.md](AGENTS.md), which most assistants read automatically, and `bash scripts/check-conventions.sh` verifies the mechanical ones.

Welcome to TerraGuard! This document outlines the standard practices and guidelines for contributing to our codebase. Please review these before making any changes.

---

## FOLDER STRUCTURE

- Follow **"Feature-based structure"**, a method of grouping related files and components based on features and functionalities.

*Example:*
```
frontend/
├── src/
│   ├── features/
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── auth/
│   │   └── ...
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   └── Input.tsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── ...
```

- **Separate Frontend and Backend functionalities**
  Our project strictly separates the Next.js frontend (`frontend/`) from the Python analysis logic (`backend/`). The two meet only through the Python serverless routes in `frontend/api/`, which import from `backend/` — nothing else crosses that boundary.

  See [DIRECTORY.md](DIRECTORY.md) for a file-by-file map of what currently lives where.

---

## FOLDER AND FILE NAMES, & NAMING CONVENTIONS

### Backend (Python)

| Element | Casing | Example |
| :--- | :--- | :--- |
| Variable names | snake_case | `project_name` |
| Constants | SCREAMING_SNAKE_CASE | `MIN_COUNT` |
| Methods & functions | snake_case | `def get_satellite_data()` |
| Module & file names | snake_case | `change_point.py` |
| Class names | PascalCase | `DataAnalyzer` |

### Frontend (Next.js / React)

| Element | Casing | Example |
| :--- | :--- | :--- |
| Variable names | camelCase | `projectName` |
| Constants | SCREAMING_SNAKE_CASE | `MIN_COUNT` |
| Methods & functions | camelCase | `function fetchData()` |
| React Components | PascalCase | `SingleLookup.tsx` |
| Class Names | PascalCase | `UserClass` |
| Hooks & utilities | camelCase | `useAuth.ts` |

**NOTE:** for Booleans, variable names must begin with `is`, `has`, or `should`
*Example:* `isActive`, `hasAccess`, `shouldFetch`

### Database (If applicable)

| Element | Casing | Example |
| :--- | :--- | :--- |
| Table name | snake_case + 's' | `projects`, `users` |
| Column name | snake_case | `project_name`, `user_email` |
| Primary & foreign keys | table_name + '_id' | `user_id`, `project_id` |

---

## SEPARATION OF CONCERNS

- Data-fetching logic should be placed in a **custom hook** instead of inside the UI component, so the component only displays data and avoids loading flicker, race conditions, and messy code.

**Bad Example:**
```tsx
import { useState, useEffect } from "react";

function Dashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyze")
      .then(res => res.json())
      .then(result => {
        setData(result);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return <p>Loading...</p>;
  return <div>{data}</div>;
}
export default Dashboard;
```

**GOOD Example:**
```tsx
import { useState, useEffect } from "react";

export function useAnalysisData() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyze")
      .then(res => res.json())
      .then(result => {
        setData(result);
        setIsLoading(false);
      });
  }, []);

  return { data, isLoading };
}
```
```tsx
import { useAnalysisData } from "./useAnalysisData";

function Dashboard() {
  const { data, isLoading } = useAnalysisData();

  if (isLoading) return <p>Loading...</p>;
  return <div>{data}</div>;
}
export default Dashboard;
```

---

## KEYS & ENVIRONMENT

- Environment keys should not be hardcoded in the system. They should be stored in environment variables to protect sensitive information and allow configuration across different environments (e.g., development, staging, production).
- Environment variables should use clear, uppercase names with underscores.

*Example:*
- `NEXT_PUBLIC_API_URL`
- `GEE_SERVICE_ACCOUNT_KEY`

---

## USER EXPERIENCE (UX)

- The application should feel "alive" by incorporating the following elements:
  - **Modals** for actions such as analyzing, editing, and logging out.
  - Clear empty states with **indicator messages** (e.g., "No projects found. Add a new lookup to get started.").

---

## GIT WORKFLOW

Each development task should be done in a separate branch to keep the `main` branch stable and organized. This helps isolate changes, makes collaboration easier, and allows code to be reviewed properly before merging.

### Step-by-step Process

| Process | Command |
| :--- | :--- |
| Clone the repository | `git clone <repository-url>` |
| Go to the project folder | `cd <repository-name>` |
| Switch to main branch | `git checkout main` |
| Pull the latest changes from main | `git pull origin main` |
| Create new branch for your task | `git checkout -b feature/<feature-name>` |

**Branch Naming Conventions:**
- `feature/` = when creating a new feature for the application
- `fix/` = when fixing a bug
- `chore/` = when making non-functional updates such as updating the README or other project files

### After making/adding changes:

| Process | Command |
| :--- | :--- |
| Stage the changes | `git add .`<br><br>For staging specific file:<br>`git add src/components/Button.tsx` |
| Commit the changes | `git commit -m "add: login page UI"`<br><br>**Use message prefixes:**<br>- `add:` when adding a new feature or functionality<br>- `fix:` when fixing a bug or issue<br>- `update:` when modifying or improving an existing feature<br>- `refactor:` when restructuring code without changing functionality<br>- `delete:` when deleting code, features, or files<br>- `docs:` when updating documentation<br>- `test:` when adding or modifying tests<br>- `chore:` when updating configuration or maintenance tasks<br>- `config:` when changing configuration files |
| Push the branch | `git push origin feature/<feature-name>` |
| Create a Pull Request | Set the base branch to main |

### Notes:

- If changes are made to the `main` branch while your branch is not up to date, use rebase to synchronize your branch with the latest changes.
  ```bash
  git checkout main
  git pull origin main
  git checkout <your-branch-name>
  git rebase main
  ```

- Ensure that the `.env` file is included in the `.gitignore` file to prevent environment variables and sensitive information from being pushed to the repository.
