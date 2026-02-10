.PHONY: test lint run build shell

test:
	docker-compose run --rm backend pytest

lint:
	docker-compose run --rm backend flake8 .
	docker-compose run --rm backend black . --check

format:
	docker-compose run --rm backend black .

run:
	docker-compose up

build:
	docker-compose build

shell:
	docker-compose run --rm backend python manage.py shell

makemigrations:
	docker-compose run --rm backend python manage.py makemigrations

migrate:
	docker-compose run --rm backend python manage.py migrate
