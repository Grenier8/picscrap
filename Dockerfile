FROM node:20-slim

ARG DATABASE_URL
ARG CHROME_PATH

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production
ENV PORT=3010
ENV DATABASE_URL=$DATABASE_URL
ENV CHROME_PATH=$CHROME_PATH


# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install curl gnupg -y \
    && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install google-chrome-stable -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


# Crea y usa la carpeta de la app
WORKDIR /usr/src/app

# Copia package.json y package-lock.json primero (aprovecha el cache de Docker)
COPY package*.json ./

# Instala dependencias (esto también ejecutará el postinstall si existe)
RUN npm install

# Copia el resto del código
COPY . .

# Build tu app (opcional si usas TypeScript o build step)
RUN npm run build

# Genera Prisma (opcional si usas Prisma)
RUN npx prisma generate --no-engine

# Expón el puerto (ajústalo si tu app usa otro puerto)
EXPOSE 3010

# Comando de inicio (ajusta según tu start script)
CMD ["npm", "run", "start"]
