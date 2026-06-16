# #35: Data Model & API

**GitHub Issue:** [#35 — Data Model & API](https://github.com/Volscente/vademecum-germanicum/issues/35)
**GitHub Milestone:** [3-better-fields-structure](https://github.com/Volscente/vademecum-germanicum/milestones)
**Notion page:** [3 — Better Fields Structure](https://www.notion.so/3-Better-Fields-Structure-3575cc6c0f07801a84ced321560685cc)

---

## Technical Scope

**In scope:**

- `backend/src/backend/models.py` — add `CaseEnum`, `RegisterEnum`; add ORM models `Sense`, `GrammarPattern`, `ExampleSentence`; extend `Word` with `auxiliary_verb`, `principal_forms` (JSON), and `senses` relationship; remove columns `prepositions`, `example_sentences`, `idiomatic_usages`; retain `translation`
- `backend/src/backend/schemas.py` — add `GrammarPatternCreate/Read`, `ExampleSentenceCreate/Read`, `SenseCreate/Read`; extend `WordCreate`/`WordRead`/`WordUpdate` to embed `senses`; retain `translation` field; import new enums
- `backend/src/backend/main.py` — update `POST /words/` (nested sense persistence in single transaction); update `GET /words/` (eager-load via `selectinload`); update `PUT /words/{id}` (replace sense list atomically); search filter unchanged (`word` and `translation` columns both retained)
- `migration.sql` — SQL script to alter the live `words` table: drop `prepositions`, `example_sentences`, `idiomatic_usages` columns; add `auxiliary_verb` and `principal_forms`; new sense-family tables are auto-created by `models.Base.metadata.create_all` on startup
- `backend/tests/test_words.py` — update existing tests for new `WordRead` shape; add tests for nested persistence and constraint enforcement
- `backend/tests/fixtures/word_payloads.py` — update `valid_word_payload` to include a `senses` array

**Out of scope:**

- LLM enrichment (`enrichment.py`) — TASK-2 (#36)
- Frontend TypeScript interfaces, Zod schema, and React components — TASK-3 (#37)
- Alembic or any automated migration toolchain

---

## Architecture

```txt
POST /words/
     │  body: WordCreate { word, gender, auxiliary_verb, principal_forms,
     │                     senses: [{ meaning_summary, register,
     │                                grammar_patterns: [{preposition, case}],
     │                                example_sentences: [{german, english}] }] }
     │
     │  Pydantic: senses min_length=1, grammar_patterns min_length=1,
     │            example_sentences min_length=1  → HTTP 422 if violated
     ▼
  Word() ORM
     │
     └── Sense()  (one per senses entry, cascade insert)
           ├── GrammarPattern()  (one per grammar_patterns entry)
           └── ExampleSentence() (one per example_sentences entry)
     │
     db.add(word) → db.commit()  (single transaction)
     │
     ▼
  WordRead { id, word, ..., senses: [SenseRead { grammar_patterns, example_sentences }] }


GET /words/
     │  query: skip, limit, search
     ▼
  db.query(Word)
     .options(
         selectinload(Word.senses).selectinload(Sense.grammar_patterns),
         selectinload(Word.senses).selectinload(Sense.example_sentences),
     )
     .filter(or_(Word.word.ilike(f"%{search}%"),
                 Word.translation.ilike(f"%{search}%")) if search else ...)
     │
     ▼
  list[WordRead]


PUT /words/{id}
     │  body: WordUpdate (all fields optional)
     ▼
  fetch Word by id  →  HTTP 404 if missing
     │
     ├── patch scalar fields (exclude_unset)
     │
     └── if senses present in body:
           delete existing Sense children (cascade deletes GrammarPattern + ExampleSentence)
           insert new Sense children
     │
     db.commit()
     │
     ▼
  WordRead (with refreshed senses)
```

### Why replace-all for sense updates

`PUT /words/{id}` replaces the full sense list when `senses` is included in the body, rather than patching individual senses by ID. This avoids partial-update complexity (tracking which sense IDs to keep, delete, or upsert). The client always sends the complete desired state.

---

## Tech Stack

No new packages required. All new models, schemas, and loading strategies use existing dependencies (SQLAlchemy, Pydantic, FastAPI).

---

## Implementation Details

### Modules / Files

| File                                              | Action | Description                                                                              |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `backend/src/backend/models.py`                   | Modify | Add `CaseEnum`, `RegisterEnum`, `Sense`, `GrammarPattern`, `ExampleSentence`; extend `Word` |
| `backend/src/backend/schemas.py`                  | Modify | Add sense-family schemas; extend `WordCreate`, `WordRead`, `WordUpdate`                  |
| `backend/src/backend/main.py`                     | Modify | Update `POST /words/`, `GET /words/`, `PUT /words/{id}`                                  |
| `migration.sql`                                   | Create | Alter `words` table: drop deprecated columns, add verb morphology columns                |
| `backend/tests/test_words.py`                     | Modify | Update tests for new `WordRead` shape; add nested persistence and constraint tests       |
| `backend/tests/fixtures/word_payloads.py`         | Modify | Update `valid_word_payload` to include a `senses` array                                  |

---

### Key Functions

```python
@app.post("/words/", response_model=schemas.WordRead)
def create_word(word: schemas.WordCreate, db: Session = Depends(get_db)) -> models.Word:
    """Persist a new word with its full sense graph in a single transaction.

    Builds a `Word` ORM instance from the validated `WordCreate` body, then
    constructs nested `Sense`, `GrammarPattern`, and `ExampleSentence` instances
    and appends them to `word.senses`. The cascade relationship handles child
    inserts automatically when `db.add(db_word)` is called.

    Args:
        word: Validated request body; Pydantic enforces `min_length=1` on
              `senses`, `grammar_patterns`, and `example_sentences`.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The persisted `Word` ORM instance, serialized as `WordRead` by FastAPI.

    Raises:
        HTTPException (422): Raised automatically by FastAPI/Pydantic if
                             validation constraints are violated (e.g., empty senses list).
    """
```

```python
@app.get("/words/", response_model=list[schemas.WordRead])
def read_words(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    db: Session = Depends(get_db),
) -> list[models.Word]:
    """List words with their full sense graph, avoiding N+1 queries.

    Uses `selectinload` to eager-load `senses → grammar_patterns` and
    `senses → example_sentences` in two additional SELECT statements rather
    than one query per word row. The search filter applies case-insensitive
    ILIKE on `word` only (the `translation` column is removed in this milestone).

    Args:
        skip: Number of rows to offset.
        limit: Maximum number of rows to return.
        search: If provided, filters by case-insensitive match on the `word` column.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        List of `Word` ORM instances with sense children pre-loaded.
    """
```

```python
@app.put("/words/{word_id}", response_model=schemas.WordRead)
def update_word(
    word_id: int,
    word_update: schemas.WordUpdate,
    db: Session = Depends(get_db),
) -> models.Word:
    """Partially update a word's scalar fields and optionally replace its sense list.

    Scalar fields are patched using `exclude_unset`. If `senses` is present in
    the request body, the existing `Sense` children are deleted via cascade and
    replaced with the new list in the same transaction. If `senses` is absent,
    existing senses are untouched.

    Args:
        word_id: Primary key of the word to update.
        word_update: Partial update payload; all fields are optional.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The updated `Word` ORM instance, serialized as `WordRead`.

    Raises:
        HTTPException (404): If no word with `word_id` exists in the database.
        HTTPException (400): If `word`, when provided, is an empty or whitespace-only string.
    """
```

---

### Data Models / Schemas

**New enums and ORM models (`backend/src/backend/models.py`):**

```python
class CaseEnum(str, enum.Enum):
    nominativ = "Nominativ"
    akkusativ = "Akkusativ"
    dativ = "Dativ"
    genitiv = "Genitiv"


class RegisterEnum(str, enum.Enum):
    formal = "Formal"
    colloquial = "Colloquial"
    neutral = "Neutral"
    technical = "Technical"


class ExampleSentence(Base):
    __tablename__ = "example_sentences"
    id = Column(Integer, primary_key=True, index=True)
    sense_id = Column(Integer, ForeignKey("senses.id"), nullable=False)
    german = Column(String, nullable=False)
    english = Column(String, nullable=False)
    sense = relationship("Sense", back_populates="example_sentences")


class GrammarPattern(Base):
    __tablename__ = "grammar_patterns"
    id = Column(Integer, primary_key=True, index=True)
    sense_id = Column(Integer, ForeignKey("senses.id"), nullable=False)
    preposition = Column(String, nullable=True)  # NULL = no preposition required
    case = Column(Enum(CaseEnum), nullable=False)
    sense = relationship("Sense", back_populates="grammar_patterns")


class Sense(Base):
    __tablename__ = "senses"
    id = Column(Integer, primary_key=True, index=True)
    word_id = Column(Integer, ForeignKey("words.id"), nullable=False)
    meaning_summary = Column(String, nullable=False)
    register = Column(Enum(RegisterEnum), nullable=False)
    word = relationship("Word", back_populates="senses")
    grammar_patterns = relationship(
        "GrammarPattern", back_populates="sense", cascade="all, delete-orphan"
    )
    example_sentences = relationship(
        "ExampleSentence", back_populates="sense", cascade="all, delete-orphan"
    )


# Changes to existing Word class:
#   ADD: auxiliary_verb = Column(String, nullable=True)
#   ADD: principal_forms = Column(JSON, nullable=True)  # list[str] len=3: [infinitiv, präteritum, partizip_ii]
#   ADD: senses = relationship("Sense", back_populates="word", cascade="all, delete-orphan")
#   REMOVE columns: translation, prepositions, example_sentences, idiomatic_usages
```

**New Pydantic schemas (`backend/src/backend/schemas.py`):**

```python
class GrammarPatternCreate(BaseModel):
    preposition: Optional[str] = None
    case: CaseEnum


class GrammarPatternRead(GrammarPatternCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ExampleSentenceCreate(BaseModel):
    german: str
    english: str


class ExampleSentenceRead(ExampleSentenceCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SenseCreate(BaseModel):
    meaning_summary: str
    register: RegisterEnum
    grammar_patterns: list[GrammarPatternCreate] = Field(min_length=1)
    example_sentences: list[ExampleSentenceCreate] = Field(min_length=1)


class SenseRead(BaseModel):
    id: int
    meaning_summary: str
    register: RegisterEnum
    grammar_patterns: list[GrammarPatternRead]
    example_sentences: list[ExampleSentenceRead]
    model_config = ConfigDict(from_attributes=True)


# WordBase changes:
#   REMOVE fields: prepositions, example_sentences, idiomatic_usages
#   RETAIN field: translation (quick-look summary, used in search)
#   ADD fields:
#     auxiliary_verb: Optional[str] = None
#     principal_forms: Optional[list[str]] = None  # unconstrained JSON; [infinitiv, präteritum, partizip_ii] by convention
#
# WordCreate: add senses: list[SenseCreate] = Field(min_length=1)
# WordRead:   add senses: list[SenseRead]
# WordUpdate: add senses: Optional[list[SenseCreate]] = None  (absent = leave senses untouched)
```

---

### Testing Strategy

**Fixture update** (`backend/tests/fixtures/word_payloads.py`):

Update `valid_word_payload` to include a minimal valid `senses` list:

```python
{
    "word": "Zuschlag",
    "gender": "der",
    "word_nominative": "Zuschlag",
    "translation": "Surcharge",
    "category": "noun",
    "senses": [
        {
            "meaning_summary": "Surcharge",
            "register": "Neutral",
            "grammar_patterns": [{"preposition": None, "case": "Nominativ"}],
            "example_sentences": [{"german": "Der Zuschlag beträgt 10 Euro.", "english": "The surcharge is 10 euros."}],
        }
    ],
}
```

**Updated tests** (`backend/tests/test_words.py`):

- `test_create_word_success` — assert `response.json()["senses"]` has length 1; assert `senses[0]["meaning_summary"] == "Surcharge"`
- `test_get_words_list` — assert each word in response contains a `senses` key
- `test_search_words_success` — unchanged in intent; search by `word` and by `translation` both still work
- `test_update_word_success` — send `senses` in the update payload; assert the new sense list is returned

**New tests** (`backend/tests/test_words.py`):

- `test_create_word_with_multiple_senses` — create a word with 2 senses; assert `GET /words/` returns both senses with their grammar patterns and example sentences
- `test_create_word_empty_senses_rejected` — POST with `senses=[]`; assert HTTP 422
- `test_create_word_empty_grammar_patterns_rejected` — POST with a sense containing `grammar_patterns=[]`; assert HTTP 422
- `test_create_word_empty_example_sentences_rejected` — POST with a sense containing `example_sentences=[]`; assert HTTP 422
- `test_update_word_replaces_senses` — create a word with 1 sense; PUT with 2 senses; assert response contains exactly 2 senses and original sense is gone
- `test_update_word_without_senses_preserves_existing` — create a word with 1 sense; PUT with scalar field only (no `senses` key); assert sense count is still 1

**Edge cases:**

- `grammar_patterns` with `preposition=null` → accepted (explicit "no preposition required")
- `principal_forms` with fewer or more than 3 strings → HTTP 422 (enforced by `min_length=3, max_length=3`)
- `senses` key absent from `PUT` body → existing senses preserved unchanged

---

### Open Questions / Risks

- [ ] **Models declaration order:** SQLAlchemy requires that referenced models are declared before models that hold `ForeignKey` to them. Declare `ExampleSentence` and `GrammarPattern` before `Sense`, and `Sense` before the `Word` relationship is fully wired. **Target:** during implementation of `models.py`
