# Servidor do Sons Mágicos (app web + progresso + gravações + APK)
FROM node:22-alpine
RUN apk add --no-cache ffmpeg openssl
WORKDIR /app
COPY servidor/ ./servidor/
COPY web/ ./web/
ENV PORTA=8080 WEB=/app/web DADOS=/dados
EXPOSE 8080 8443
VOLUME ["/dados"]
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/api/ping || exit 1
CMD ["node", "servidor/server.js"]
