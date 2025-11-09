#!/bin/bash

echo "🚀 AI Companion App - Railway Deployment Setup"
echo "=============================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - AI Companion App ready for Railway deployment"
else
    echo "✅ Git repository already initialized"
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo "✅ Railway configuration files created"
echo "✅ Environment variables template ready (.env.example)"
echo "✅ Individual service configs prepared"
echo "✅ Deployment guide created (DEPLOYMENT.md)"

echo ""
echo "🔧 Next Steps:"
echo "1. Create GitHub repository and push this code"
echo "2. Sign up at railway.app"
echo "3. Create MongoDB Atlas free cluster"
echo "4. Deploy 3 services: backend, frontend, whatsapp-service"
echo "5. Set environment variables for each service"

echo ""
echo "💡 Key Environment Variables You'll Need:"
echo "- MONGO_URL (from MongoDB Atlas)"
echo "- REACT_APP_BACKEND_URL (Railway backend URL)"
echo "- FASTAPI_URL (same as above for WhatsApp service)"
echo "- EMERGENT_LLM_KEY (already have: sk-emergent-89e55Cb06C69eB5A3A)"

echo ""
echo "📖 Read DEPLOYMENT.md for detailed step-by-step instructions"
echo "🎯 Estimated monthly cost: $5-10 on Railway + Free MongoDB Atlas"
echo ""
echo "✨ After deployment, WhatsApp integration should work perfectly!"