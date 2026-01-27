# Pabbly Mapper Service
# Node.js 18 LTS en Alpine para imagen ligera

FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files primero (aprovecha cache de Docker)
COPY package*.json ./

# Instalar dependencias de produccion
RUN npm ci --only=production

# Copiar codigo fuente
COPY . .

# Puerto que expone Cloud Run
ENV PORT=8080
EXPOSE 8080

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs
USER nodejs

# Comando de inicio
CMD ["node", "index.js"]
