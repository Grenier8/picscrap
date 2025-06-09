# Use Node.js LTS with Debian Buster for better compatibility with Puppeteer
FROM node:20-bullseye-slim

# Set working directory
WORKDIR /usr/src/app

# Install system dependencies required for Puppeteer and other tools
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome for Puppeteer
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.pool.sks-keyservers.net/debian/ bullseye main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the TypeScript application
RUN npm run build

# Generate Prisma client
RUN npx prisma generate --no-engine

# Expose the port the app runs on (make sure this matches your Fastify port)
EXPOSE 3010

# Command to run the application
CMD ["npm", "run", "start"]
