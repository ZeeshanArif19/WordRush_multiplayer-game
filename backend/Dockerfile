FROM node:20-slim

WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies for all workspaces
RUN npm install

# Copy source code
COPY shared ./shared
COPY backend ./backend
COPY 5_letters.csv ./5_letters.csv

# Build the shared package if needed, then build the backend
RUN npm run build -w shared
RUN npm run build -w backend

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "dist/server.js"]
