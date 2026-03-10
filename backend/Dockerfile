# syntax=docker/dockerfile:1
FROM --platform=$TARGETPLATFORM golang:1.24-bullseye AS builder

WORKDIR /src

ENV GOPRIVATE=github.com/shank318/coasterai
ENV CGO_ENABLED=1
ARG TARGETOS TARGETARCH
ARG VERSION v1.0.12


RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN go env -w GOMODCACHE=/root/.cache/go-build

COPY go.mod go.sum ./
RUN --mount=type=cache,id=s/90787016-4716-4812-82da-75b26360bada-/root/.cache/go-build,target=/root/.cache/go-build go mod download

COPY . .
RUN --mount=type=cache,id=s/90787016-4716-4812-82da-75b26360bada-/root/.cache/go-build,target=/root/.cache/go-build \
    GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="-s -w -X main.version=${VERSION}" -o /app/coasterai ./cmd/coasterai

FROM debian:bullseye-slim as bullseye-base

ARG GOOGLE_APPLICATION_CREDENTIALS_JSON

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app

# Write the firebase config file
RUN echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" | base64 --decode > /app/firebase-config.json

COPY --from=builder /app/coasterai /app/coasterai

WORKDIR /app

EXPOSE 8787

CMD [ "/app/coasterai", "start" ]
