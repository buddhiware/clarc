.PHONY: dev dev-bg build shell run add test logs stop clean

dev:
	docker compose up --build

dev-bg:
	docker compose up --build -d

shell:
	docker compose exec clarc sh

run:
	docker compose exec clarc $(CMD)

add:
	docker compose exec clarc bun add $(PKG)

build:
	mkdir -p dist-binary
	docker compose run --rm build

test:
	docker compose exec clarc bun test

logs:
	docker compose logs -f clarc

stop:
	docker compose down

clean:
	docker compose down -v --rmi local
	rm -rf dist-binary
