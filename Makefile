.PHONY: dev dev-bg build shell run add test logs stop clean tauri-dev tauri-build tauri-icons

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

# --- Tauri desktop app ---

tauri-dev:
	bun tauri dev

tauri-build:
	TARGET=$$(rustc --print host-tuple) && \
	bun build --compile src/cli/main.ts --outfile "src-tauri/binaries/clarc-core-$$TARGET" && \
	bun tauri build

tauri-icons:
	bun tauri icon src-tauri/icons/app-icon.png
