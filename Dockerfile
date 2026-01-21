# Multi-stage build for DNA helper app

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production frontend with nginx
FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY --from=frontend-build /app/public/assets /usr/share/nginx/html/assets
COPY --from=frontend-build /app/public/data /usr/share/nginx/html/data
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# Stage 3: Backend server
FROM node:20-alpine AS backend
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/ ./
EXPOSE 3001
CMD ["node", "index.js"]
