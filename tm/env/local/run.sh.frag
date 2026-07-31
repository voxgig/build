#!/bin/sh
# $$Name$$ backend - local run (generated; customize via tm/env/local/)
# In-process Seneca instance, in-memory store, port $$port$$.
cd "$(dirname "$0")/../../.."
export NODE_ENV=development
exec npm run local
