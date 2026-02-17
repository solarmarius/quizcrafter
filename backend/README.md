# QuizCrafter - Backend

The backend is built with [FastAPI](https://fastapi.tiangolo.com/), [SQLModel](https://sqlmodel.tiangolo.com/), and [PostgreSQL](https://www.postgresql.org/).

## Requirements

- [Docker](https://www.docker.com/)
- [uv](https://docs.astral.sh/uv/) for Python package and environment management

## Docker Compose

Start the local development environment with Docker Compose:

```bash
docker compose watch
```

## Architecture

The backend uses a **modular, domain-driven architecture** where each feature lives in its own package under `backend/src/`:

```text
src/
├── main.py               # FastAPI app setup, router registration, middleware
├── config.py             # Pydantic-based settings
├── database.py           # SQLAlchemy/SQLModel session management
├── middleware.py          # Request/response logging with correlation IDs
├── exceptions.py         # ServiceError hierarchy
├── retry.py              # Retry decorator with exponential backoff
├── auth/                 # Canvas OAuth, JWT auth, user management
├── canvas/               # Canvas API integration (courses, modules, export)
├── quiz/                 # Quiz CRUD, status management, orchestration, sharing
│   └── orchestrator/     # Background task workflows (extraction, generation, export)
├── question/             # Question management and generation
│   ├── types/            # Polymorphic question types (6 types)
│   ├── providers/        # LLM provider abstraction (Azure OpenAI)
│   ├── services/         # Generation and content services
│   ├── templates/        # Question generation prompt templates
│   └── workflows/        # Generation orchestration workflows
├── content_extraction/   # HTML/PDF content parsing and processing
├── export/               # Export formatting templates
└── coverage/             # Content coverage tracking
```

Each domain module follows a consistent structure: `models.py`, `router.py`, `service.py`, `schemas.py`, `dependencies.py`, `constants.py`, `exceptions.py`.

## General Workflow

By default, the dependencies are managed with [uv](https://docs.astral.sh/uv/), go there and install it.

From `./backend/` you can install all the dependencies with:

```console
$ uv sync
```

Then you can activate the virtual environment with:

```console
$ source .venv/bin/activate
```

Make sure your editor is using the correct Python virtual environment, with the interpreter at `backend/.venv/bin/python`.

## VS Code

There are already configurations in place to run the backend through the VS Code debugger, so that you can use breakpoints, pause and explore variables, etc.

The setup is also already configured so you can run the tests through the VS Code Python tests tab.

## Docker Compose Override

During development, you can change Docker Compose settings that will only affect the local development environment in the file `docker-compose.override.yml`.

The changes to that file only affect the local development environment, not the production environment. So, you can add "temporary" changes that help the development workflow.

For example, the directory with the backend code is synchronized in the Docker container, copying the code you change live to the directory inside the container. That allows you to test your changes right away, without having to build the Docker image again. It should only be done during development, for production, you should build the Docker image with a recent version of the backend code. But during development, it allows you to iterate very fast.

There is also a command override that runs `fastapi run --reload` instead of the default `fastapi run`. It starts a single server process (instead of multiple, as would be for production) and reloads the process whenever the code changes. Have in mind that if you have a syntax error and save the Python file, it will break and exit, and the container will stop. After that, you can restart the container by fixing the error and running again:

```console
$ docker compose watch
```

To get inside the container with a `bash` session you can start the stack with:

```console
$ docker compose watch
```

and then in another terminal, `exec` inside the running container:

```console
$ docker compose exec backend bash
```

You should see an output like:

```console
root@7f2607af31c3:/app#
```

that means that you are in a `bash` session inside your container, as a `root` user, under the `/app` directory, this directory has another directory called "src" inside, that's where your code lives inside the container: `/app/src`.

There you can use the `fastapi run --reload` command to run the debug live reloading server.

```console
$ fastapi run --reload src/main.py
```

## Backend Tests

To test the backend run:

```console
$ bash ./scripts/test.sh
```

The tests run with Pytest, modify and add tests to `./backend/tests/`.

### Test Running Stack

If your stack is already up and you just want to run the tests, you can use:

```bash
docker compose exec backend bash scripts/tests-start.sh
```

That script just calls `pytest` after making sure that the rest of the stack is running. If you need to pass extra arguments to `pytest`, you can pass them to that command and they will be forwarded.

For example, to stop on first error:

```bash
docker compose exec backend bash scripts/tests-start.sh -x
```

### Test Coverage

When the tests are run, a file `htmlcov/index.html` is generated, you can open it in your browser to see the coverage of the tests.

## Migrations

As during local development your app directory is mounted as a volume inside the container, you can also run the migrations with `alembic` commands inside the container and the migration code will be in your app directory (instead of being only inside the container). So you can add it to your git repository.

Make sure you create a "revision" of your models and that you "upgrade" your database with that revision every time you change them. As this is what will update the tables in your database. Otherwise, your application will have errors.

- Start an interactive session in the backend container:

```console
$ docker compose exec backend bash
```

- Alembic is already configured to import your SQLModel models from the domain modules under `./backend/src/`.

- After changing a model (for example, adding a column), inside the container, create a revision, e.g.:

```console
$ alembic revision --autogenerate -m "Add column last_name to User model"
```

- Commit to the git repository the files generated in the alembic directory.

- After creating the revision, run the migration in the database (this is what will actually change the database):

```console
$ alembic upgrade head
```

If you don't want to use migrations at all, uncomment the lines in the file at `./backend/src/database.py` that end in:

```python
SQLModel.metadata.create_all(engine)
```

and comment the line in the file `scripts/prestart.sh` that contains:

```console
$ alembic upgrade head
```

If you don't want to start with the default models and want to remove them / modify them, from the beginning, without having any previous revision, you can remove the revision files (`.py` Python files) under `./backend/alembic/versions/`. And then create a first migration as described above.
