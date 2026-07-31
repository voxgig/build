# $$Name$$ backend - docker compose (generated; customize via tm/env/docker/)
services:
  $$name$$-backend:
    build:
      context: ../../..
      dockerfile: gen/env/docker/Dockerfile
    ports:
      - "$$port$$:$$port$$"
    environment:
      NODE_ENV: production
