# ---- build: compile the GUI (tsc + vite) -------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first, so source edits don't invalidate the install layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime: the tiny zero-dependency server (static files + /api proxy) -----
FROM node:24-alpine
ENV NODE_ENV=production \
	YTPT_GUI_HOST=0.0.0.0 \
	YTPT_GUI_PORT=8080 \
	YTPT_API_URL=http://ytpt:8000
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY server/index.mjs ./server/index.mjs

# Inside the container it listens on 0.0.0.0 (the server prints a "beyond loopback" warning; expected).
# Publish the port deliberately, e.g. 127.0.0.1:8080:8080: ytpt has no authentication.
USER node
EXPOSE 8080

# Healthy = the GUI itself is serving. (It does not require the ytpt API to be up.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.YTPT_GUI_PORT||8080)+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
