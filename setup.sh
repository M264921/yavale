#!/bin/bash
set -e
# Setup script for MontanaOpenAiTV

echo "🔥 Iniciando configuración de MontanaOpenAiTV..."

# Paso 1: Instalar dependencias de Node
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

# Paso 2: Verificar carpeta HTML
echo "🌐 Contenido de la carpeta html/:"
ls -la html || echo "⚠️  No se encontró la carpeta html"

# Paso 3: Ejecutar configuración de VPN si existe
if [ -f "vpn/setup.sh" ]; then
  echo "🔐 Ejecutando configuración de VPN..."
  chmod +x vpn/setup.sh
  ./vpn/setup.sh
fi

echo "✅ Configuración completada con éxito"
