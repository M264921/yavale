#!/bin/bash
set -e

echo "🔥 Iniciando configuración de MontanaOpenAiTV..."

# Paso 1: Instalar dependencias de Node (si hay en addon o app)
if [ -f "addon/package.json" ]; then
  echo "📦 Instalando dependencias de Node para el addon..."
  cd addon
  npm install
  cd ..
fi

if [ -f "app/package.json" ]; then
  echo "📦 Instalando dependencias de Node para la app..."
  cd app
  npm install
  cd ..
fi

# Paso 2: Preparar HTML si hace falta (opcional)
echo "🌐 Verificando carpeta html/"
ls -la html

# Paso 3: Configurar VPN si es necesario (a futuro)
if [ -f "vpn/setup.sh" ]; then
  echo "🔐 Ejecutando configuración de VPN..."
  chmod +x vpn/setup.sh
  ./vpn/setup.sh
fi

echo "✅ Configuración completada con éxito"
