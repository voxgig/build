# $$Name$$ - docker environment

    cd backend && npm run build
    docker compose -f gen/env/docker/compose.yml up --build

Port $$port$$. The image runs the local (in-memory) runner; wire a real
store before production use.
