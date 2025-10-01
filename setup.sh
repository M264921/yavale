#!/bin/bash
set -e

echo "[YaVale] Iniciando configuracion basica..."

if ! command -v npm >/dev/null 2>&1; then
  echo "[YaVale] npm no esta instalado. Instala Node.js antes de seguir."
  exit 1
fi

if [ -f "packages/stremio-addon/package.json" ]; then
  echo "[YaVale] Instalando dependencias del addon Stremio..."
  (cd packages/stremio-addon && npm install)
fi

echo "[YaVale] Contenido de packages/web-client:"
ls -la packages/web-client || echo "[YaVale] No se encontro packages/web-client"

echo "[YaVale] Consulta packages/vpn para configurar WireGuard manualmente."

echo "[YaVale] Configuracion finalizada."
