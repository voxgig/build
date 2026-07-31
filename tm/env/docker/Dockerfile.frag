# $$Name$$ backend image (generated; customize via tm/env/docker/)
FROM node:$$node$$-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY model/model.json model/model.json
COPY dist/ dist/
ENV NODE_ENV=production
EXPOSE $$port$$
CMD ["node", "dist/env/local/local.js"]
