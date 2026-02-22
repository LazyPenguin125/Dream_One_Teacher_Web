# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build

# 接收 Supabase 環境變數（Zeabur 在建置時注入）
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# 複製整個 repo，再切換到子目錄建置
COPY . .
WORKDIR /build/培訓web
RUN npm ci && npm run build

# ── Stage 2: Serve ──────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /build/培訓web/dist /usr/share/nginx/html

# React Router 需要 fallback 到 index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
