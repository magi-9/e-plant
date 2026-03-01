# E-Plant Project

A Django + React E-shop developed with TDD.

## Tech Stack

- Backend: Django + DRF
- Frontend: React + TailwindCSS
- DB: PostgreSQL
- Cache: Redis (planned)
- Auth: JWT
- Testing: pytest, factoryboy

## Setup

### Prerequisites

- Docker & Docker Compose

### Running locally

```bash
docker-compose up --build
```

## Service testing

Service-layer testing patterns are documented in [doc/SERVICE_TESTING_PATTERNS.md](doc/SERVICE_TESTING_PATTERNS.md).

Run service-layer tests with coverage:

```bash
docker compose exec -T backend pytest tests/ \
	--cov=orders.services \
	--cov=services.email \
	--cov=users.services \
	--cov=products.services \
	--cov-report=term-missing \
	--cov-fail-under=90
```
