# 🎮 Price Radar TCG

Sistema de protección de margen para tienda de Trading Card Games.

## 📋 Descripción

Price Radar TCG es una herramienta interna que automatiza la comparación entre precios de la tienda (Shopify) y los del mercado internacional (TCGGO API), mostrando únicamente los productos con desviaciones relevantes.

## 🚀 Características

- ✅ Comparación de precios para producto sellado
- ✅ Soporte para múltiples juegos (Magic, Pokémon, Riftbound, One Piece, Gundam)
- ✅ Actualización automática diaria
- ✅ Integración con Shopify
- ✅ Dashboard web para staff

## 🛠️ Stack Técnico

- **Backend:** Node.js + Express
- **Base de Datos:** PostgreSQL (Render.com)
- **API Pricing:** TCGGO API (RapidAPI)
- **Frontend:** JavaScript/HTML/CSS

## 📦 Instalación

### Prerrequisitos

- Node.js v18+ 
- NPM v9+
- PostgreSQL (Render.com)
- Cuenta de Shopify
- API Key de RapidAPI

### Setup Local

1. Clonar el repositorio:
```bash
git clone https://github.com/IJaqueP/price-check-oasis.git
cd price-check-oasis