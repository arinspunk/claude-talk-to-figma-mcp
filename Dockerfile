# Use the Bun image as the base image
FROM oven/bun:latest

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Expose WebSocket port
EXPOSE 3055

# Run TypeScript directly with Bun
CMD ["bun", "run", "src/socket.ts"]
