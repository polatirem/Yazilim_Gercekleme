FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/sdk-js/package.json ./packages/sdk-js/package.json
RUN npm install
COPY apps/web ./apps/web
# Rewrites are resolved at build time; inside Compose the API is reachable as http://api:8000.
ARG API_INTERNAL_URL=http://api:8000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN npm --workspace @axiom/web run build
FROM node:22-alpine
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
