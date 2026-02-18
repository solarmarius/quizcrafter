# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuizCrafter is a Canvas LMS quiz generator application that uses language models to generate questions based on course content. The application consists of a FastAPI backend with PostgreSQL database and a React frontend with TypeScript.

**Key Features:**

- Canvas OAuth integration for course access
- AI-powered question generation from course materials (6 question types)
- Question review and approval workflow
- Direct exam creation in Canvas
- Quiz sharing and collaboration
- Internationalization (English and Norwegian)
- Onboarding flow for new users
- Manual module creation for custom content
- Progress tracking and analytics

## Development Commands

### Full Stack Development

```bash
# Start the entire stack with Docker Compose (recommended)
docker compose watch

# View logs for all services
docker compose logs

# View logs for specific service
docker compose logs backend
docker compose logs frontend
```

### Backend Development

```bash
# RUN TESTS
cd backend && source .venv/bin/activate && bash scripts/test.sh

# RUN LINTING
cd backend && source .venv/bin/activate && bash scripts/lint.sh

# Individual linting commands (from backend/)
mypy src
ruff check src
ruff format src --check
```

All backend database migrations should be prompted to the user to be done manually.

### Frontend Development

```bash
# From frontend/ directory
cd frontend

# Install dependencies
npm install

# Run local development server
npm run dev

# Build for production
npm run build

# Run linting and formatting
npm run lint

# Generate API client from backend OpenAPI spec
npm run generate-client

# Run end-to-end tests
npx playwright test
npx playwright test --ui
```

### Cross-Service Commands

```bash
# Generate frontend client from backend API (from project root)
./scripts/generate-client.sh

# Run pre-commit hooks manually
uv run pre-commit run --all-files
```

## Architecture

### Backend (FastAPI + SQLModel + PostgreSQL)

The backend uses a **modular, domain-driven architecture** with each feature in its own package under `backend/src/`.

- **Entry Point**: `backend/src/main.py` - FastAPI application setup, router registration, middleware, Sentry integration
- **Configuration**: `backend/src/config.py` - Pydantic-based settings (database, Canvas, LLM, logging)
- **Database**: `backend/src/database.py` - SQLAlchemy/SQLModel session management, connection pooling
- **Middleware**: `backend/src/middleware.py` - Request/response logging with correlation IDs
- **Exceptions**: `backend/src/exceptions.py` - ServiceError hierarchy with FastAPI handlers
- **Retry**: `backend/src/retry.py` - Retry decorator with exponential backoff

**Domain Modules:**

- **`backend/src/auth/`** - Canvas OAuth flow, JWT authentication, user management
- **`backend/src/canvas/`** - Canvas API integration (courses, modules, content fetching, quiz export)
- **`backend/src/quiz/`** - Quiz CRUD, status management, orchestration, sharing/collaboration
- **`backend/src/question/`** - Question types, LLM generation, providers, templates, workflows
- **`backend/src/content_extraction/`** - HTML/PDF content parsing and processing
- **`backend/src/export/`** - Export formatting templates
- **`backend/src/coverage/`** - Content coverage tracking

Each module follows a consistent structure: `models.py`, `router.py`, `service.py`, `schemas.py`, `dependencies.py`, `constants.py`, `exceptions.py`.

- **Tests**: `backend/tests/` - Pytest-based test suite (51 test files)

### Frontend (React + TypeScript + Chakra UI)

- **Entry Point**: `frontend/src/main.tsx` - React application bootstrap
- **Routing**: `frontend/src/routes/` - TanStack Router file-based routing
- **Components**: `frontend/src/components/` - 80+ components organized by feature (Common, Questions, QuizCreation, Dashboard, Onboarding, QuizSharing, UserSettings, layout, forms, ui)
- **API Client**: `frontend/src/client/` - Auto-generated from backend OpenAPI spec
- **Custom Hooks**: `frontend/src/hooks/` - 11 reusable React hooks (auth, API, polling, mutations, toast, errors, editing, dates, localization, onboarding, selection)
- **Internationalization**: `frontend/src/i18n/` - i18next with English and Norwegian translations (7 namespaces)
- **Utilities**: `frontend/src/lib/` - API client config, constants, query config, validation (Zod), utility functions
- **Types**: `frontend/src/types/` - TypeScript type definitions
- **Theme**: `frontend/src/theme/` - Chakra UI theme customization with button recipes

### Frontend Architecture Documentation

Comprehensive documentation for the frontend architecture:

- **`/docs/frontend/ARCHITECTURE.md`** - Complete architectural overview, component organization, and development guidelines
- **`/docs/frontend/CUSTOM_HOOKS.md`** - Detailed documentation for custom React hooks with usage examples
- **`/docs/frontend/COMPONENT_PATTERNS.md`** - Reusable component patterns and design principles

### Key Models

- **User** (`src/auth/models.py`): Canvas user with OAuth tokens, refresh mechanism, onboarding flag
- **Quiz** (`src/quiz/models.py`): Quiz with consolidated status system (8 states), module-based question batching, soft deletion
- **Question** (`src/question/types/base.py`): Polymorphic question model with JSONB storage for type-specific data, edit history, approval workflow
- **QuizCollaborator** (`src/quiz/models.py`): Maps users to quizzes for sharing
- **QuizInvite** (`src/quiz/models.py`): Shareable invite links with use limits and expiration

### Key Enums

- **QuizStatus**: 8 states tracking quiz lifecycle (see Status System below)
- **FailureReason**: 7 specific error types for debugging
- **QuestionType**: `multiple_choice`, `multiple_answer`, `true_false`, `fill_in_blank`, `matching`, `categorization`
- **QuestionDifficulty**: `easy`, `medium`, `hard`
- **QuizLanguage**: English (`en`), Norwegian (`no`)
- **QuizTone**: `academic`, `casual`, `encouraging`, `professional`

## Development Workflow

1. **Canvas OAuth Setup**: Users authenticate via Canvas to access course content
2. **Course Selection**: Users select which Canvas course to generate questions from
3. **Quiz Creation**: Quiz created with status `created`, language, and tone selection
4. **Content Processing**: Course modules are parsed and prepared for LLM input (status: `extracting_content`)
5. **Question Generation**: Language model generates questions across 6 types (status: `generating_questions`)
6. **Review Process**: Users approve/reject generated questions (status: `ready_for_review` or `ready_for_review_partial`)
7. **Canvas Export**: Approved questions are exported to Canvas (status: `exporting_to_canvas`)
8. **Quiz Published**: Quiz is successfully published to Canvas (status: `published`)

**Error Handling**: Any step can fail (status: `failed`) with specific failure reasons for debugging.

## Status System Architecture

The application uses a **consolidated status system** with a single `status` field and detailed failure tracking:

### QuizStatus Enum

- `created` - Quiz created, ready to start
- `extracting_content` - Extracting content from Canvas modules
- `generating_questions` - AI generating questions from extracted content
- `ready_for_review` - All questions ready for user review and approval
- `ready_for_review_partial` - Some questions ready, partial generation complete
- `exporting_to_canvas` - Exporting approved questions to Canvas
- `published` - Quiz successfully published to Canvas
- `failed` - Process failed (see failure_reason for details)

### FailureReason Enum

- `content_extraction_error` - Failed to extract content from Canvas
- `no_content_found` - No content found in selected modules
- `llm_generation_error` - AI question generation failed
- `no_questions_generated` - No questions could be generated
- `canvas_export_error` - Failed to export to Canvas
- `network_error` - Network connectivity issues
- `validation_error` - Data validation failed

### Status Light Color System

- 🔴 **Red**: `failed` - Any process failed
- 🟠 **Orange**: `created`, `extracting_content`, `generating_questions` - Processing
- 🟡 **Yellow**: `exporting_to_canvas` - Exporting to Canvas
- 🟣 **Purple**: `ready_for_review`, `ready_for_review_partial` - Ready for user review
- 🟢 **Green**: `published` - Successfully completed

## Important Conventions

### Backend

- Modular, domain-driven architecture under `backend/src/`
- Use SQLModel for database models (combines SQLAlchemy + Pydantic)
- All API endpoints return consistent response formats
- Canvas tokens are securely stored and refreshed automatically
- Database migrations managed with Alembic
- Comprehensive test coverage required
- Use consolidated status system for all quiz state management
- Structured logging with structlog and correlation IDs
- Background task orchestration with safe error handling
- Polymorphic question type system with registry pattern

### Frontend

- File-based routing with TanStack Router
- Auto-generated API client from backend OpenAPI spec
- Chakra UI v3 for consistent component styling with custom design system
- TypeScript strict mode enabled with 100% type coverage
- Canvas authentication state managed globally
- Custom hooks system for reusable logic and API operations
- i18next for internationalization (English and Norwegian, 7 namespaces)
- Zod for form validation with react-hook-form
- Component patterns documented in `/docs/frontend/` for consistency
- StatusLight component with 5-color system based on consolidated status
- Smart polling system with dynamic intervals based on quiz status
- QuizPhaseProgress component for detailed three-phase status display
- Virtualized question lists for performance

### Testing

- Backend: Pytest with coverage reporting (51 test files)
- Frontend: Playwright for end-to-end testing with API mocking
- CI: Multi-shard Playwright testing for parallelism
- All tests must pass before deployment
- Pre-commit hooks enforce code quality (ruff, mypy)

## Canvas Integration

The application integrates deeply with Canvas LMS:

- OAuth 2.0 flow for secure authentication
- Course and module content fetching
- Direct quiz/exam creation in Canvas
- Token refresh handling for long-term access
- **Course Filtering**: Optional environment-configurable course prefix filtering
- Canvas mock server for local development (`mocks/`)

## Environment Setup

Development uses Docker Compose with service-specific overrides. The stack includes:

- Backend API (FastAPI)
- Frontend (React dev server)
- PostgreSQL database
- Adminer (database admin)
- Traefik (reverse proxy)
- Canvas mock server (for local development)
- Grafana + Loki + Promtail (monitoring and logging)

URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database Admin: http://localhost:8081
- Grafana Dashboard: http://localhost:3000
- Traefik Dashboard: http://localhost:8090

### Course Prefix Filtering

The application supports optional course filtering by name prefixes through the `CANVAS_COURSE_PREFIX_FILTER` environment variable:

```bash
# Show all courses (default behavior)
CANVAS_COURSE_PREFIX_FILTER=""

# Filter specific prefixes (comma-separated)
CANVAS_COURSE_PREFIX_FILTER="SB_ME_,TK-,INF-"
```

- **Empty/unset**: Shows all courses (default)
- **Comma-separated**: Only courses starting with specified prefixes are shown
- **Case-sensitive**: Exact prefix matching
- **No matches**: Returns empty list if no courses match configured prefixes
