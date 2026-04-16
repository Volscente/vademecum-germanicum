# Planning Guidelines

A three-tier planning workflow for developing coding features and implementations.
Each tier owns distinct content — no content is duplicated across tiers.

```text
Notion (WHY + WHAT)
  └── GitHub Issues (WHICH task + tracking)
        └── specs/ (HOW it gets built)
```

---

## Tier 1: Notion (Strategy)

Notion is the single source of truth for business context. All rationale, background, and
high-level scope live here and are referenced downward — never copied.

### Main Feature Page

One page per feature or major initiative.

| Section             | Content                                              |
| ------------------- | ---------------------------------------------------- |
| **Scope**           | What is and is not included in this feature          |
| **Rationale**       | Why this feature, what problem it solves             |
| **Background**      | Prior work, constraints, decisions that led here     |
| **Deliverables**    | Measurable outcomes that define success              |
| **Sprint Overview** | Table: sprint number, goal, status, link to sub-page |

### Sprint Sub-Pages

One sub-page per sprint. Sprint pages are about execution — they do not repeat the feature's
Scope/Rationale/Background, which already live on the main page.

| Section                | Content                                             |
| ---------------------- | --------------------------------------------------- |
| **Sprint Goal**        | One sentence: what this sprint achieves             |
| **GitHub Issues**      | Table with issue number, title, assignee, status    |
| **Dependencies**       | Other sprints or external work this sprint waits on |
| **Definition of Done** | Conditions that close this sprint                   |

---

## Tier 2: GitHub Issues (Tracking)

GitHub Issues are the tactical layer. They do not re-state business context from Notion —
instead they link to it and focus on what needs to be done and how to verify it.

### Issue Structure

```markdown
Title: [Sprint N] Brief description of the task

## Notion Sprint

<URL to the Notion sprint sub-page>

## Scope

What this specific issue covers (narrow, concrete — not the feature scope).

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] ...

## Notes

Pointers to the spec file, known constraints, or implementation hints.

## Checklist

- [ ] Spec file updated (`specs/planning/gh-{number}-{title}.md`)
- [ ] Tests written
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if applicable)
- [ ] Project version bumped (if applicable)
```

### Linking to Notion

Notion page URLs contain a UUID suffix that remains stable even if the page is renamed:
`https://www.notion.so/workspace/Page-Name-<uuid>`

Use that URL directly in the issue body. Optionally, add a **Notion URL** custom field
in GitHub Projects for filtering and dashboards.

The mapping is: one Notion sprint sub-page → one or more GitHub Issues.
Each issue links back to its Notion sprint page; the sprint page lists all its issues.

### What Does Not Belong in a GitHub Issue

- Scope/Rationale/Background — those are in Notion; link, don't copy.
- Changelog (Added/Changed) — issues describe intent. Changelogs describe outcomes.
  Record actual changes in the PR description and in `CHANGELOG.md`.

---

## Tier 3: Repository Specs (Technical)

Specs are pure technical documents for engineers. No business rationale. The spec answers
_how_ something gets built; Notion answers _why_.

### Folder Structure

```text
specs/
└── planning/
    ├── gh-42-add-user-auth.md
    ├── gh-43-token-refresh-flow.md
    └── ...
```

> **Why `specs/` and not `docs/`?** `docs/` is the default source directory for MkDocs
> and conflicts with other documentation tooling. `specs/` is unambiguous.

### File Naming Convention

```text
gh-{issue-number}-{kebab-case-title}.md
```

Examples: `gh-42-add-user-auth.md`, `gh-107-migrate-db-schema.md`

The issue number makes the link to GitHub explicit and searchable.

### Spec File Structure

````markdown
# gh-{number}: {Title}

**GitHub Issue:** #{number}
**Notion Sprint:** <URL>

---

## Technical Scope

Which files, modules, and interfaces change. What is explicitly out of scope.

## Architecture

Component diagram, data flow, or sequence diagram (ASCII or linked image).
Describe how the new code integrates with existing components.

## Tech Stack

New packages or dependencies introduced:

| Package        | Version | Justification                        |
| -------------- | ------- | ------------------------------------ |
| `package-name` | `>=x.y` | Why this package, not an alternative |

## Implementation Details

### Modules / Files

| File                   | Action | Description         |
| ---------------------- | ------ | ------------------- |
| `src/module/file.py`   | Create | What this file does |
| `src/existing/file.py` | Modify | What changes        |

### Key Functions

```python
def function_name(param: Type, param2: Type) -> ReturnType:
    """
    Brief description.

    Args:
        param: Description.
        param2: Description.

    Returns:
        Description.

    Raises:
        ErrorType: When.
    """
    ...
```
````

### Data Models / Schemas

Pydantic models, dataclasses, or DB schema changes with field descriptions.

## Testing Strategy

- Unit tests: what to mock, what to test directly
- Integration tests: which boundaries to test end-to-end
- Edge cases: explicit list of non-obvious scenarios to cover

## Open Questions / Risks

- [ ] Question or risk description — owner, target resolution date

---

## Cross-Tier Reference Map

```text
┌─────────────────────────────────────────────┐
│                   NOTION                    │
│             Feature Main Page               │
│     Scope · Rationale · Background          │
│       Deliverables · Sprint Overview        │
│                                             │
│        Sprint Sub-Page (per sprint)         │
│   Goal · Issue Table · Dependencies · DoD   │
└──────────────────┬──────────────────────────┘
                   │ URL reference
                   ▼
┌─────────────────────────────────────────────┐
│              GITHUB ISSUES                  │
│     Scope (narrow) · Acceptance Criteria    │
│            Notes · Checklist                │
│       [links back to Notion sprint]         │
└──────────────────┬──────────────────────────┘
                   │ issue number in filename
                   ▼
┌─────────────────────────────────────────────┐
│    specs/planning/gh-{N}-{title}.md         │
│    Technical Scope · Architecture           │
│    Tech Stack · Implementation Details      │
│    Testing Strategy · Open Questions        │
│    [links back to GitHub issue + Notion]    │
└─────────────────────────────────────────────┘
```

Each tier links to the tier above it for context. Content flows down; references flow up.

---

## Examples

All three examples trace the same feature — **User Authentication** (JWT-based login).

---

### Tier 1 Example: Notion

#### Main Feature Page — "User Authentication"

| Section             | Content                                                                           |
| ------------------- | --------------------------------------------------------------------------------- |
| **Scope**           | JWT-based login and token refresh. Excludes OAuth, SSO, and social login.         |
| **Rationale**       | Unprotected API endpoints expose customer data; auth is a compliance requirement. |
| **Background**      | Prior session-cookie approach caused cross-domain failures on the mobile client.  |
| **Deliverables**    | All API routes enforce auth; login endpoint live in staging by end of Sprint 1.   |
| **Sprint Overview** | Sprint 1: login endpoint · Sprint 2: token refresh · Sprint 3: logout + cleanup   |

#### Sprint 1 Sub-Page — "Login Endpoint"

| Section                | Content                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| **Sprint Goal**        | Ship a working `POST /auth/login` endpoint to staging.                |
| **GitHub Issues**      | #42 Implement JWT login endpoint · #43 Add auth middleware            |
| **Dependencies**       | PyJWT package approved by security review (Sprint 0 prerequisite).    |
| **Definition of Done** | Both issues closed; end-to-end login verified in staging environment. |

---

### Tier 2 Example: GitHub Issue

```markdown
Title: [Sprint 1] Implement JWT login endpoint

## Notion Sprint

https://www.notion.so/acme/Sprint-1-Login-Endpoint-a1b2c3d4e5f678901234567890abcdef

## Scope

Create `POST /auth/login`. Validates email + password against the users table and
returns a signed JWT (24 h expiry). Does not include token refresh or logout.

## Acceptance Criteria

- [ ] POST /auth/login returns 200 + `{ token }` on valid credentials
- [ ] Returns 401 `{ error: "invalid credentials" }` on bad email or password
- [ ] Token payload includes `user_id`, `email`, `exp`
- [ ] Token is rejected by the auth middleware after expiry

## Notes

Spec: `specs/planning/gh-42-implement-jwt-login.md`
Use PyJWT (already in requirements.txt). Secret loaded from `JWT_SECRET` env var.

## Checklist

- [ ] Spec file updated (`specs/planning/gh-42-implement-jwt-login.md`)
- [ ] Tests written
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

---

### Tier 3 Example: Spec File

**File:** `specs/planning/gh-42-implement-jwt-login.md`

````markdown
# gh-42: Implement JWT Login Endpoint

**GitHub Issue:** #42
**Notion Sprint:** https://www.notion.so/acme/Sprint-1-Login-Endpoint-a1b2c3d4e5f678901234567890abcdef

---

## Technical Scope

**In scope:** `src/auth/router.py`, `src/auth/service.py`, `src/auth/schemas.py`, `src/main.py`
**Out of scope:** token refresh (`/auth/refresh`), logout, OAuth providers.

## Architecture

```text
Client
  │  POST /auth/login  { email, password }
  ▼
AuthRouter (FastAPI)
  │  calls
  ▼
AuthService.login(email, password)
  │  queries
  ▼
UserRepository.get_by_email(email)   ← existing component, no changes
  │  on match: verify password hash
  ▼
jwt.encode({ user_id, email, exp }, JWT_SECRET)
  │  returns
  ▼
{ token: "<jwt>" }  →  200 OK
```

## Tech Stack

| Package | Version | Justification                                         |
| ------- | ------- | ----------------------------------------------------- |
| `PyJWT` | `>=2.8` | Lightweight, well-audited JWT library; no extra deps. |

## Implementation Details

### Modules / Files

| File                  | Action | Description                                              |
| --------------------- | ------ | -------------------------------------------------------- |
| `src/auth/schemas.py` | Create | Pydantic models: `LoginRequest`, `TokenResponse`         |
| `src/auth/service.py` | Create | `AuthService.login()` — validates credentials, signs JWT |
| `src/auth/router.py`  | Create | FastAPI router: `POST /auth/login`                       |
| `src/main.py`         | Modify | Register `auth_router` on the app instance               |

### Key Functions

```python
def login(email: str, password: str) -> str:
    """
    Validate credentials and return a signed JWT.

    Args:
        email: The user's email address.
        password: Plaintext password to verify against the stored hash.

    Returns:
        A signed JWT string with 24-hour expiry.

    Raises:
        AuthenticationError: If email not found or password does not match.
    """
    ...
```

### Data Models / Schemas

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str        # plaintext; hashing is handled inside AuthService

class TokenResponse(BaseModel):
    token: str           # signed JWT string
```

## Testing Strategy

- **Unit tests:** mock `UserRepository.get_by_email`; cover valid login, wrong password,
  unknown email, and expired token rejection.
- **Integration tests:** POST to `/auth/login` against a seeded test DB; assert 200 + valid JWT.
- **Edge cases:** empty password, email with mixed case, token used at exact expiry second.

## Open Questions / Risks

- [ ] Should token expiry (24 h) be configurable via env var? — @simone, target 2026-04-18
- [ ] Do we blacklist tokens on logout? If yes, this expands scope to Sprint 3. — @simone, target 2026-04-18
````
