# Stage 1: Build dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Only copy package files to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for potential build steps)
RUN npm ci

# Copy the rest of the application code
COPY src/ ./src/

# Stage 2: Production image
FROM node:20-alpine

# Set Node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Install native dependencies required by better-sqlite3 in alpine
RUN apk add --no-cache sqlite-libs

# Create directories for DB and Logs with correct permissions
RUN mkdir -p data logs && chown node:node data logs

# Copy node_modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copy source code
COPY --from=builder /usr/src/app/src ./src
COPY package*.json ./

# Switch to the non-root 'node' user for security
USER node

# Expose the port the app runs on
EXPOSE 3000

# Define volumes for persistent SQLite data and application logs
VOLUME ["/usr/src/app/data", "/usr/src/app/logs"]

# Start the application
CMD ["npm", "start"]
