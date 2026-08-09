FROM node:24 AS build
WORKDIR /src
RUN apt update \
  && apt dist-upgrade -y \
  && apt-get clean autoclean \
  && apt-get autoremove --yes \
  && rm -rf /var/lib/{apt,dpkg,cache,log}/ \
  && corepack enable \
  && corepack prepare pnpm@11.5.2 --activate
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
COPY package.json package.json
RUN pnpm install --frozen-lockfile
COPY . .

# Network-specific config baked into the JS bundle at build time (Vite only
# reads VITE_* at build time, not at container runtime). Defaults are the
# mainnet values; CI passes different --build-arg values per environment -
# see .github/workflows/build-fe.yml and k8s/*/deployment-fe.yaml, whose
# CSP_CONNECT_SRC container env must be kept in sync with these.
ARG VITE_API_BASE_URL=https://api.algorand.scan.biatec.io
ARG VITE_ALGORAND_ALGOD_URL=https://algorand-algod-public.de-4.biatec.io
ARG VITE_ALGORAND_INDEXER_URL=https://mainnet-idx.4160.nodely.dev
ARG VITE_ARC56_REGISTRY_URL=https://algorand.scan.biatec.io/arc56-registry
ARG VITE_USDC_ASSET_ID=31566704
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_ALGORAND_ALGOD_URL=${VITE_ALGORAND_ALGOD_URL} \
    VITE_ALGORAND_INDEXER_URL=${VITE_ALGORAND_INDEXER_URL} \
    VITE_ARC56_REGISTRY_URL=${VITE_ARC56_REGISTRY_URL} \
    VITE_USDC_ASSET_ID=${VITE_USDC_ASSET_ID}

RUN pnpm run build
RUN cd /src/dist && ls
#RUN pnpm run test:e2e

FROM nginxinc/nginx-unprivileged:latest
USER root
ENV DEBIAN_FRONTEND noninteractive
RUN apt update && apt dist-upgrade -y && apt install -y bc mc wget telnet git curl iotop atop vim && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/
RUN mkdir /app

# default.conf.template is rendered to /etc/nginx/conf.d/default.conf at
# container start by nginx's built-in docker-entrypoint.d envsubst step,
# reading CSP_CONNECT_SRC from the container's runtime env (set per
# environment in the k8s manifests) - this is what lets one image serve any
# network's CSP without a rebuild.
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
ENV CSP_CONNECT_SRC="https://api.algorand.scan.biatec.io wss://api.algorand.scan.biatec.io https://algorand-algod-public.de-4.biatec.io https://mainnet-idx.4160.nodely.dev https://algorand.scan.biatec.io"
RUN chown nginx:nginx /etc/nginx/conf.d /etc/nginx/templates -R
RUN chmod 0600 /etc/nginx/conf.d /etc/nginx/templates -R
RUN chmod 0700 /etc/nginx/conf.d /etc/nginx/templates
USER nginx
WORKDIR /app
COPY --from=build /src/dist .
RUN pwd && ls
