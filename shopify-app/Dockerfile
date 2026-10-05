FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

# Install all deps for build, then prune for runtime
RUN npm ci && npm cache clean --force
RUN npm remove @shopify/cli || true

COPY . .

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

CMD ["npm", "run", "docker-start"]
