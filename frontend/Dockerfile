# Build stage
FROM node:20-slim AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

RUN npm install

COPY shared ./shared
COPY frontend ./frontend

RUN npm run build -w shared
RUN npm run build -w frontend

# Production stage
FROM nginx:stable-alpine

# Copy built files from build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
