# Stage 1: Build dependencies and compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Only copy package files to leverage Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy the rest of the application source code
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

# Set Node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Install native dependencies required by better-sqlite3 in alpine
# hadolint ignore=DL3018
RUN apk add --no-cache sqlite-libs

# Create directories for DB and Logs with correct permissions
RUN mkdir -p data logs && chown node:node data logs

# Copy node_modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copy compiled JavaScript output
COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./

# Switch to the non-root 'node' user for security
USER node

# Expose the port the app runs on
EXPOSE 3000

# Define volumes for persistent SQLite data and application logs
VOLUME ["/usr/src/app/data", "/usr/src/app/logs"]

# Start the application from the compiled output
CMD ["node", "dist/app.js"]
