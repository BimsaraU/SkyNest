# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app

# Install libc for sharp/optional native deps if needed (generally not required if not using sharp)
RUN apk add --no-cache libc6-compat

# Only copy lockfiles to leverage Docker cache better
COPY package.json ./
# If you had a lockfile, copy it here to get deterministic installs
# COPY package-lock.json ./

RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# -------- Builder: build Next.js (standalone) --------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with standalone output for smaller runtime image
# Turbopack is enabled by default in package.json scripts
# NOTE: No DATABASE_URL needed at build—lib/db.ts is lazy and admin reports are dynamic
RUN npm run build

# -------- Runtime: minimal runner --------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy standalone server output
# Next 15 standalone output is under .next/standalone and static assets under .next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# If you use Next Image with remote patterns only, public may be optional, but keep safe.

# Ensure the server can read env files mounted at runtime if provided
# (We generally rely on real envs; do not bake .env into image)

# Create writable directories for Next.js cache and file uploads
RUN mkdir -p /app/.next/cache /app/public/uploads && \
	chown -R nextjs:nodejs /app/.next /app/public/uploads

# Optionally, direct Next cache to /app/.next/cache (default). To use /tmp instead, uncomment:
# ENV NEXT_CACHE_DIR=/tmp/next-cache

# Use non-root user
USER nextjs

EXPOSE 3000

# Start Next standalone server
CMD ["node", "server.js"]
