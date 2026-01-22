#!/bin/bash

# Script para actualizar versión automáticamente antes del deploy
# Uso: ./update.version.sh

echo "🌀 Actualizando versión de la aplicación"

# Generar nueva versión basada en timestamp
NEW_VERSION=$(date +"%Y%m%d.%H%M%S")

echo "📦 Nueva versión: $NEW_VERSION"

# Actualizar version.js
sed -i "s/const APP_VERSION = '.*';/const APP_VERSION = '$NEW_VERSION';/" frontend/js/version.js

# Actualizar todos los ?v= en index.html
sed -i "s/\?v=[0-9.]\+/?v=$NEW_VERSION/g" frontend/index.html

echo "✅ Versión actualizada a: $NEW_VERSION"
echo ""
echo "Próximos pasos:"
echo "1. git add ."
echo "2. git commit -m 'chore: update version to $NEW_VERSION'"
echo "3. git push origin main"
echo "4. En VPS: git pull && sudo cp -r frontend/* /var/www/priceradar/"