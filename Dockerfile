FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public, inlined at build time
ARG VITE_PB_URL
ARG VITE_VAPID_PUBLIC_KEY
RUN npm run build

# Nitro bundles everything into .output, no node_modules needed at runtime
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
CMD ["node", ".output/server/index.mjs"]
