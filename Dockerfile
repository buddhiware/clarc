FROM oven/bun:1-alpine

RUN apk add --no-cache git curl

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

EXPOSE 3838 5173

CMD ["bun", "run", "dev"]
