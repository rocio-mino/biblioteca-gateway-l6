# L1-gateway/servicios: una sola imagen para libros.mjs y prestamos.mjs.
# El contexto es la raiz de L1-gateway, porque libros.mjs lee ../datos/catalogo.json.
# Cual de los dos arranca lo decide el command de cada servicio en el compose.yml.
FROM node:24-alpine
WORKDIR /app/servicios

COPY servicios/package.json servicios/package-lock.json ./
RUN npm ci

COPY servicios/ ./
COPY datos/ ../datos/

EXPOSE 3001 3002
CMD ["node", "libros.mjs"]