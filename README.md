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

## Deployment compose split

- `docker-compose.staging.yml`: staging setup (keeps current tunnel + manual Traefik routing labels).
- `docker-compose.prod.yml`: production setup for Dokploy UI managed routing (no manual Traefik labels, no webhook tunnel relay).

### Production quick start

```bash
cp .env.prod.example .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

For Dokploy deployments, you can set variables in the Dokploy UI instead of committing `.env.prod`.
The production compose treats both `.env` and `.env.prod` as optional env files.

Set domains and public IP routing in Dokploy UI.
For database connectivity in Dokploy, set `DB_HOST` to your Dokploy Postgres service hostname (commonly `postgres`).
Note: Docker Compose creates a per-stack default network; backend is additionally attached to `dokploy-network` in production compose so it can reach separately managed Dokploy services.

## Production domain split

This project supports a split storefront setup:

- Landing page on `https://ebringer.sk/`
- Product storefront on `https://dynamicabutment.ebringer.sk/products`

Set these environment variables for production routing:

- `PRIMARY_DOMAIN=ebringer.sk`
- `SHOP_DOMAIN=dynamicabutment.ebringer.sk`
- `VITE_LANDING_HOST=ebringer.sk`
- `VITE_SHOP_HOST=dynamicabutment.ebringer.sk`
- `VITE_API_URL=/api`
- `VITE_HOME_PAGE_READY=true|false`

Backend security settings should include both origins:

- `ALLOWED_HOSTS=ebringer.sk,dynamicabutment.ebringer.sk`
- `CORS_ALLOWED_ORIGINS=https://ebringer.sk,https://dynamicabutment.ebringer.sk`
- `CSRF_TRUSTED_ORIGINS=https://ebringer.sk,https://dynamicabutment.ebringer.sk`

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
