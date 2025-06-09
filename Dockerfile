# Usa una imagen oficial de Node.js (puedes elegir la versión que prefieras)
FROM node:20-slim

# Instala dependencias necesarias para Chromium
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Crea y usa la carpeta de la app
WORKDIR /app

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
