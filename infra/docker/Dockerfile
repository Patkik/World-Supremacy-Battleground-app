FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS web-dev
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web apps/web
COPY infra/docker/health.cjs infra/docker/health.cjs
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace", "@wsb/web", "--", "--hostname", "0.0.0.0"]

FROM dependencies AS seed
COPY infra/docker infra/docker
CMD ["node", "infra/docker/seed.cjs"]

FROM eclipse-temurin:21-jre-jammy@sha256:1eac8b8fee11ca7d6725a48bc5d41992ed1561504ebae25490d2d062847e8269 AS java
FROM dependencies AS emulators
COPY --from=java /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="/opt/java/openjdk/bin:${PATH}"
ENV FIREBASE_CLI_DISABLE_UPDATE_CHECK=true
RUN java -version && npx firebase setup:emulators:firestore && npx firebase setup:emulators:storage && npx firebase setup:emulators:ui
COPY infra/firebase infra/firebase
COPY infra/docker infra/docker
COPY infra/docker/firebase.json firebase.local.json
EXPOSE 9099 8188 9199 4408 4418 4518 9288
CMD ["node", "infra/docker/emulators.cjs"]

FROM dependencies AS web-build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false \
    NEXT_PUBLIC_WSB_LOCAL_TESTING=false \
    NEXT_TELEMETRY_DISABLED=1
COPY apps/web apps/web
RUN npm run build

FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS web-production
WORKDIR /workspace
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=web-build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=node:node /workspace/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
