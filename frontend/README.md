# QuizCrafter - Frontend

The frontend is built with [Vite](https://vitejs.dev/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [TanStack Query](https://tanstack.com/query), [TanStack Router](https://tanstack.com/router), [Chakra UI](https://chakra-ui.com/), and [i18next](https://www.i18next.com/).

## Key Features

- **80+ React components** organized by feature (Questions, QuizCreation, Dashboard, Onboarding, QuizSharing, UserSettings, etc.)
- **11 custom hooks** for auth, API operations, polling, mutations, toast notifications, error handling, editing state, date formatting, localization, onboarding, and question selection
- **6 question types** with dedicated display and editor components: Multiple Choice, Multiple Answer, True/False, Fill in the Blank, Matching, Categorization
- **Internationalization** with i18next supporting English and Norwegian (7 translation namespaces)
- **Smart polling** with status-based intervals for real-time quiz progress updates
- **Form validation** with Zod schemas and react-hook-form
- **Virtualized lists** with TanStack Virtual for performance
- **Auto-generated API client** from backend OpenAPI spec

## Frontend Development

Before you begin, ensure that you have either the Node Version Manager (nvm) or Fast Node Manager (fnm) installed on your system.

- To install fnm follow the [official fnm guide](https://github.com/Schniz/fnm#installation). If you prefer nvm, you can install it using the [official nvm guide](https://github.com/nvm-sh/nvm#installing-and-updating).

- After installing either nvm or fnm, proceed to the `frontend` directory:

```bash
cd frontend
```

- If the Node.js version specified in the `.nvmrc` file isn't installed on your system, you can install it using the appropriate command:

```bash
# If using fnm
fnm install

# If using nvm
nvm install
```

- Once the installation is complete, switch to the installed version:

```bash
# If using fnm
fnm use

# If using nvm
nvm use
```

- Within the `frontend` directory, install the necessary NPM packages:

```bash
npm install
```

- And start the live server with the following `npm` script:

```bash
npm run dev
```

- Then open your browser at <http://localhost:5173/>.

Notice that this live server is not running inside Docker, it's for local development, and that is the recommended workflow. Once you are happy with your frontend, you can build the frontend Docker image and start it, to test it in a production-like environment. But building the image at every change will not be as productive as running the local development server with live reload.

Check the file `package.json` to see other available options.

## Generate Client

### Automatically

- Activate the backend virtual environment.
- From the top level project directory, run the script:

```bash
./scripts/generate-client.sh
```

- Commit the changes.

### Manually

- Start the Docker Compose stack.

- Download the OpenAPI JSON file from `http://localhost/api/v1/openapi.json` and copy it to a new file `openapi.json` at the root of the `frontend` directory.

- To generate the frontend client, run:

```bash
npm run generate-client
```

- Commit the changes.

Notice that everytime the backend changes (changing the OpenAPI schema), you should follow these steps again to update the frontend client.

## Using a Remote API

If you want to use a remote API, you can set the environment variable `VITE_API_URL` to the URL of the remote API. For example, you can set it in the `frontend/.env` file:

```env
VITE_API_URL=https://api.my-domain.example.com
```

Then, when you run the frontend, it will use that URL as the base URL for the API.

## Code Structure

```text
frontend/src/
├── main.tsx              # App entry point
├── theme.tsx             # Chakra UI theme configuration
├── theme/                # Theme customization (button recipes, etc.)
├── client/               # Auto-generated OpenAPI client (SDK, types, schemas)
├── components/           # React components organized by feature
│   ├── Common/           # Shared components (EmptyState, QuizCard, QuizTable, etc.)
│   ├── Questions/        # Question review, display, editors (per question type)
│   │   ├── display/      # Read-only display for each question type
│   │   ├── editors/      # Edit forms for each question type
│   │   └── shared/       # Shared question components (CorrectAnswerBox, etc.)
│   ├── QuizCreation/     # Multi-step quiz creation workflow
│   ├── dashboard/        # Dashboard panels (generation, review, help)
│   ├── Onboarding/       # User onboarding flow (5 steps)
│   ├── QuizSharing/      # Quiz sharing dialog
│   ├── QuestionTypes/    # Question types reference page
│   ├── UserSettings/     # User profile and preferences
│   ├── layout/           # Sidebar navigation
│   ├── forms/            # Form field components
│   └── ui/               # Chakra UI wrappers (StatusLight, StatusBadge, etc.)
├── hooks/                # Custom React hooks
│   ├── auth/             # useAuth (Canvas OAuth)
│   ├── api/              # useQuizzes (data fetching with polling)
│   └── common/           # useApiMutation, useConditionalPolling, useCustomToast,
│                         # useErrorHandler, useEditingState, useFormattedDate,
│                         # useLocalizedRoute, useOnboarding, useQuestionSelection
├── i18n/                 # Internationalization
│   └── locales/          # en/ and no/ translation files (7 namespaces)
├── lib/                  # Utilities and configuration
│   ├── api/              # API client setup
│   ├── constants/        # App constants (routes, question types, statuses)
│   ├── utils/            # Error handling, quiz utilities, time formatting
│   ├── validation/       # Zod validation schemas
│   ├── queryConfig.ts    # React Query cache/stale configuration
│   └── routes.ts         # Route path definitions
├── routes/               # TanStack Router file-based routing
│   ├── __root.tsx        # Root layout
│   ├── login.tsx         # Login page
│   └── _layout/          # Authenticated layout with sidebar
│       ├── index.tsx           # Dashboard
│       ├── create-quiz.tsx     # Quiz creation workflow
│       ├── quizzes.tsx         # Quiz list
│       ├── quiz.$id.tsx        # Quiz detail layout
│       ├── quiz.$id.index.tsx  # Quiz overview
│       ├── quiz.$id.questions.tsx  # Question review
│       ├── settings.tsx        # User settings
│       ├── invite.$token.tsx   # Collaboration invite
│       ├── question-types.tsx  # Question types guide (EN)
│       ├── question-types-no.tsx   # Question types guide (NO)
│       ├── privacy-policy.tsx  # Privacy policy (EN)
│       └── privacy-policy-no.tsx   # Privacy policy (NO)
└── types/                # TypeScript type definitions
```

## End-to-End Testing with Playwright

The frontend includes end-to-end tests using Playwright with API mocking. To run the tests, you need to have the Docker Compose stack running. Start the stack with the following command:

```bash
docker compose up -d --wait backend
```

Then, you can run the tests with the following command:

```bash
npx playwright test
```

You can also run your tests in UI mode to see the browser and interact with it running:

```bash
npx playwright test --ui
```

### Test Structure

```text
tests/
├── e2e/                  # End-to-end test specs
│   ├── auth.spec.ts      # Authentication flows
│   └── navigation.spec.ts # Navigation tests
├── fixtures/             # Test fixtures and API mocking utilities
│   ├── api-mocking.ts    # API mock helpers
│   └── index.ts          # Fixture exports
├── mocks/                # Mock data
│   ├── quiz.mock.ts      # Quiz mock data
│   ├── questions.mock.ts # Question mock data
│   ├── courses.mock.ts   # Canvas course mock data
│   ├── user.mock.ts      # User mock data
│   └── index.ts          # Mock barrel export
└── auth.setup.ts         # Authentication setup project
```

### CI Testing

In CI, Playwright tests run across 4 parallel shards for faster execution.

To stop and remove the Docker Compose stack and clean the data created in tests, use the following command:

```bash
docker compose down -v
```

For more information on writing and running Playwright tests, refer to the official [Playwright documentation](https://playwright.dev/docs/intro).
