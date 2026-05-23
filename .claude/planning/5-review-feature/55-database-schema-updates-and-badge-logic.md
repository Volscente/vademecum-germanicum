# #55: Database Schema Updates and Badge Logic

**GitHub Issue:** [#55 — Data Layer](https://github.com/Volscente/vademecum-germanicum/issues/55)
**GitHub Milestone:** [Milestone: 5-review-feature](https://github.com/Volscente/vademecum-germanicum/milestone/7)
**Notion page:** [5 - Review Feature](https://www.notion.so/5-Review-Feature-3575cc6c0f0780c6a2beeedca2095b11)

---

## Technical Scope

**In scope:**

- `backend/src/backend/models.py` — Add `DifficultyLevelEnum` and two new columns (`difficulty_level`, `last_reviewed_at`) to the `Sense` ORM model
- `backend/src/backend/schemas.py` — Add `SenseReviewUpdate` request schema; add `SenseWithWordRead` response schema embedding parent word fields; extend `SenseRead` with the two new fields
- `backend/src/backend/main.py` — Implement `GET /senses/` and `PUT /senses/{sense_id}/review` endpoints
- `migrations/add_sense_review_columns.sql` — Manual `ALTER TABLE` script for execution against the running PostgreSQL container
- `justfile` — New `run_migration` recipe wrapping the SQL script execution
- `frontend/src/types/word.ts` — Add `difficulty_level` and `last_reviewed_at` to `Sense`; add new `SenseWithWord` interface embedding parent word fields
- `frontend/src/lib/reviewUtils.ts` — New file: `toReview(sense: SenseWithWord): boolean` using a `REVIEW_THRESHOLDS` constant lookup
- `frontend/src/lib/api.ts` — Add `getSenses()` and `updateSenseReview(senseId, difficultyLevel)` functions

**Out of scope:**

- Alembic or any automated migration toolchain — the project has none; the SQL script is run manually
- Spaced Repetition System (SRS) algorithms — badge uses a fixed time-threshold lookup only
- UI components (`SensesTable`, `ReviewArea`, etc.) — covered in TASK-2 through TASK-4
- Persisting the Review Cart across browser refreshes — accepted v1 limitation

---

## Architecture

```txt
migrations/add_sense_review_columns.sql
        │  ALTER TABLE senses ADD COLUMN difficulty_level / last_reviewed_at
        │  (run manually via: just run_migration)
        ▼
backend/src/backend/models.py
  Sense ← DifficultyLevelEnum (Easy | Medium | Hard | VeryHard)
        + difficulty_level: VARCHAR  default "Medium"
        + last_reviewed_at: TIMESTAMP nullable
        │
        ▼
backend/src/backend/schemas.py
  SenseRead (+ difficulty_level, last_reviewed_at)
  SenseWithWordRead (SenseRead + word, translation, gender, category)
  SenseReviewUpdate (difficulty_level: str)
        │
        ├──► GET /senses/
        │      query Sense JOIN Word → list[SenseWithWordRead]
        │
        └──► PUT /senses/{sense_id}/review
               validate DifficultyLevelEnum
               set last_reviewed_at = datetime.utcnow()
               persist → SenseRead
        │
        ▼  (HTTP JSON)
frontend/src/types/word.ts
  Sense (+ difficulty_level?, last_reviewed_at?)
  SenseWithWord (Sense + word, translation, gender?, category?)
        │
        ├──► frontend/src/lib/api.ts
        │      getSenses()            → GET /senses/
        │      updateSenseReview()    → PUT /senses/{id}/review
        │
        └──► frontend/src/lib/reviewUtils.ts
               REVIEW_THRESHOLDS: { Easy: 7, Medium: 3, Hard: 1, VeryHard: 0 }
               toReview(sense) → boolean  (consumed by SensesTable in TASK-2)
```

### Why badge logic lives on the frontend

The "To Review" badge is a pure function of `difficulty_level` and `last_reviewed_at` via a fixed threshold table. Keeping it in `reviewUtils.ts` avoids polluting the backend API with a derived boolean, allows instant UI updates after a review without a re-fetch, and makes threshold tuning a frontend-only change with no backend deploy.

---

## Tech Stack

No new packages required. All implementation uses existing FastAPI, SQLAlchemy, Pydantic, Next.js/React, and TypeScript already in the project.

---

## Implementation Details

### Modules / Files

| File                                          | Action | Description                                                                     |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `backend/src/backend/models.py`               | Edit   | Add `DifficultyLevelEnum`; add `difficulty_level` and `last_reviewed_at` to `Sense` |
| `backend/src/backend/schemas.py`              | Edit   | Add `SenseReviewUpdate`, `SenseWithWordRead`; extend `SenseRead`                |
| `backend/src/backend/main.py`                 | Edit   | Add `GET /senses/` and `PUT /senses/{sense_id}/review` route handlers           |
| `migrations/add_sense_review_columns.sql`     | Create | `ALTER TABLE` script adding the two new columns to `senses`                     |
| `justfile`                                    | Edit   | Add `run_migration` recipe executing the SQL script via `docker-compose exec db` |
| `frontend/src/types/word.ts`                  | Edit   | Extend `Sense`; add `SenseWithWord` interface                                   |
| `frontend/src/lib/reviewUtils.ts`             | Create | `REVIEW_THRESHOLDS` constant and `toReview()` utility function                  |
| `frontend/src/lib/api.ts`                     | Edit   | Add `getSenses()` and `updateSenseReview()` API functions                       |

---

### Key Functions

**Backend — `GET /senses/` endpoint:**

```python
@app.get("/senses/", response_model=list[schemas.SenseWithWordRead])
def read_senses(db: Session = Depends(get_db)) -> list[models.Sense]:
    """Return all senses with their parent word's key fields embedded.

    Joins Sense with Word to include word, translation, gender, and category
    in each response item, avoiding frontend joins. Uses selectinload for
    grammar_patterns and example_sentences to prevent N+1 queries.

    Args:
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        List of Sense ORM instances with Word fields accessible, serialized
        as list[SenseWithWordRead] by FastAPI.
    """
```

**Backend — `PUT /senses/{sense_id}/review` endpoint:**

```python
@app.put("/senses/{sense_id}/review", response_model=schemas.SenseRead)
def update_sense_review(
    sense_id: int,
    review_update: schemas.SenseReviewUpdate,
    db: Session = Depends(get_db),
) -> models.Sense:
    """Validate difficulty level, stamp last_reviewed_at, and persist the update.

    Validates that the incoming difficulty_level string is a member of
    DifficultyLevelEnum. Sets last_reviewed_at to datetime.now(timezone.utc) on
    the server side, keeping timestamp authority in the backend.
    Use `from datetime import datetime, timezone` — datetime.utcnow() is deprecated.

    Args:
        sense_id: Primary key of the sense to update.
        review_update: Request body carrying the chosen difficulty_level string.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The updated Sense ORM instance, serialized as SenseRead.

    Raises:
        HTTPException (404): If no sense with sense_id exists in the database.
        HTTPException (422): If difficulty_level is not a valid DifficultyLevelEnum value.
    """
```

**Frontend — `toReview` in `reviewUtils.ts`:**

```typescript
/**
 * Return true if this sense should display the "To Review" badge.
 *
 * Compares last_reviewed_at against the threshold (days) for the sense's
 * difficulty level. A sense with last_reviewed_at === null (never reviewed)
 * always returns true. VeryHard threshold is 0, so it always returns true.
 *
 * @param sense - The SenseWithWord object to evaluate.
 * @returns true if the sense is due for review, false otherwise.
 */
export function toReview(sense: SenseWithWord): boolean
```

**Frontend — `getSenses` in `api.ts`:**

```typescript
/**
 * Fetch all senses with their parent word fields from GET /senses/.
 *
 * @returns Array of SenseWithWord objects.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function getSenses(): Promise<SenseWithWord[]>
```

**Frontend — `updateSenseReview` in `api.ts`:**

```typescript
/**
 * Send a difficulty rating for a sense via PUT /senses/{senseId}/review.
 *
 * Fire-and-forget from the UX perspective: the UI advances the card
 * immediately without waiting for the response.
 *
 * @param senseId - The ID of the sense to update.
 * @param difficultyLevel - One of "Easy" | "Medium" | "Hard" | "VeryHard".
 * @returns The updated Sense object returned by the backend.
 * @throws Error if the HTTP response status is not ok (4xx / 5xx).
 */
export async function updateSenseReview(
  senseId: number,
  difficultyLevel: string,
): Promise<Sense>
```

---

### Data Models / Schemas

**Backend — new and updated Pydantic schemas:**

```python
# New enum in models.py (follows the same pattern as GenderEnum / CategoryEnum)
class DifficultyLevelEnum(str, enum.Enum):
    Easy = "Easy"
    Medium = "Medium"
    Hard = "Hard"
    VeryHard = "VeryHard"

# New columns on Sense ORM model
difficulty_level = Column(
    Enum(DifficultyLevelEnum), nullable=False, default=DifficultyLevelEnum.Medium
)
last_reviewed_at = Column(DateTime, nullable=True)

# Updated SenseRead — adds two new fields
class SenseRead(BaseModel):
    id: int
    meaning_summary: str
    register: RegisterEnum
    difficulty_level: Optional[DifficultyLevelEnum] = None
    last_reviewed_at: Optional[datetime] = None
    grammar_patterns: list[GrammarPatternRead]
    example_sentences: list[ExampleSentenceRead]

    model_config = ConfigDict(from_attributes=True)

# New request schema
class SenseReviewUpdate(BaseModel):
    difficulty_level: DifficultyLevelEnum

# New response schema embedding parent word fields
class SenseWithWordRead(SenseRead):
    word: str
    translation: str
    gender: Optional[GenderEnum] = None
    category: Optional[CategoryEnum] = None

    model_config = ConfigDict(from_attributes=True)
```

**Frontend — updated and new TypeScript interfaces in `word.ts`:**

```typescript
// Sense extended with new optional review fields
export interface Sense {
  id?: number;
  meaning_summary: string;
  register: "Formal" | "Colloquial" | "Neutral" | "Technical";
  difficulty_level?: "Easy" | "Medium" | "Hard" | "VeryHard";
  last_reviewed_at?: string | null;
  grammar_patterns: GrammarPattern[];
  example_sentences: ExampleSentence[];
}

// New interface for the GET /senses/ response shape
export interface SenseWithWord extends Sense {
  word: string;
  translation: string;
  gender?: string;
  category?: string;
}
```

**Frontend — threshold constant in `reviewUtils.ts`:**

```typescript
const REVIEW_THRESHOLDS: Record<string, number> = {
  Easy: 7,
  Medium: 3,
  Hard: 1,
  VeryHard: 0,
};
```

**SQL migration script (`migrations/add_sense_review_columns.sql`):**

```sql
ALTER TABLE senses
    ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR NOT NULL DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP NULL;
```

**`justfile` addition:**

```just
# Apply the sense review columns migration to the running PostgreSQL container
run_migration: check_root
    docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB \
        -f /dev/stdin < migrations/add_sense_review_columns.sql
```

> **Run order:** `just run_backend_recreate` first (brings all containers up, including the DB), then `just run_migration` (execs the SQL script against the running DB container).

---

### Testing Strategy

**Backend unit tests** (`backend/tests/test_senses.py` — new file):

- `GET /senses/` returns a flat list; each item includes `word`, `translation`, `gender`, `category`, `difficulty_level`, `last_reviewed_at`
- `GET /senses/` returns an empty list when no senses exist
- `PUT /senses/{id}/review` with a valid `difficulty_level` → HTTP 200, `last_reviewed_at` is set (non-null), returned `difficulty_level` matches the sent value
- `PUT /senses/{id}/review` with an invalid `difficulty_level` string → HTTP 422
- `PUT /senses/{id}/review` with a non-existent `sense_id` → HTTP 404
- `toReview()` (TypeScript): tested with Vitest or Jest if a test harness exists; otherwise verify manually:
  - `last_reviewed_at = null` → `true`
  - `difficulty_level = "VeryHard"`, any date → `true`
  - `difficulty_level = "Easy"`, reviewed 8 days ago → `true`
  - `difficulty_level = "Easy"`, reviewed 3 days ago → `false`

**Integration test** (manual — run after `just run_migration`):

```bash
# Verify migration applied
docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB \
    -c "\d senses"

# Verify GET /senses/ response shape
curl -s http://localhost:8000/senses/ | python3 -m json.tool | head -40

# Verify PUT /senses/{id}/review updates difficulty and timestamps
curl -s -X PUT http://localhost:8000/senses/1/review \
    -H "Content-Type: application/json" \
    -d '{"difficulty_level": "Hard"}' | python3 -m json.tool
```

Verify: response contains `difficulty_level: "Hard"` and a non-null `last_reviewed_at`.

**Edge cases:**

- `difficulty_level` on a brand-new sense defaults to `"Medium"` (SQL `DEFAULT` and ORM `default`)
- `last_reviewed_at` on a brand-new sense is `null` → `toReview()` must return `true`
- Running the migration script twice must be idempotent (`IF NOT EXISTS`)

---

### Open Questions / Risks

- [x] **Manual migration risk:** Run order is `just run_backend_recreate` first (starts all containers including DB), then `just run_migration` (execs SQL against the running DB). Document this explicitly in the PR description.
- [x] **Badge threshold calibration:** Accepted as provisional. Isolated in `REVIEW_THRESHOLDS` constant so thresholds can be tuned without touching component code. No tuning in this issue; a dedicated future initiative will revisit after dog-fooding.
- [x] **`datetime.utcnow()` deprecation:** No existing occurrences in the codebase — the risk was preemptive. Implementation must use `datetime.now(timezone.utc)` from the start (`from datetime import datetime, timezone`). Documented in Key Functions section above.
