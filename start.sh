#!/bin/bash

echo ""
echo "╔══════════════════════════════════════╗"
echo "║         💸 Flouze — Budget App        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trouvé. Installez-le depuis https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -c2- | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js v18+ requis (version actuelle: $(node -v))"
    exit 1
fi

echo "✅ Node.js $(node -v) détecté"
echo ""

# Install backend
echo "📦 Installation du backend..."
cd backend && npm install --silent
echo "✅ Backend prêt"

# Install frontend
echo "📦 Installation du frontend..."
cd ../frontend && npm install --silent
echo "✅ Frontend prêt"

echo ""
echo "🚀 Démarrage des serveurs..."
echo ""

# Start both
cd ../backend && node server.js &
BACKEND_PID=$!
echo "✅ Backend démarré sur http://localhost:3001 (PID: $BACKEND_PID)"

sleep 1

cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "✅ Frontend démarré sur http://localhost:5173"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Ouvrez http://localhost:5173"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Serveurs arrêtés. À bientôt !'" EXIT

wait
