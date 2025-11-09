# Railway Deployment Guide for AI Companion App

## Prerequisites
1. GitHub account
2. Railway account (sign up at railway.app)
3. MongoDB Atlas account (for database)

## Step-by-Step Deployment

### 1. Prepare MongoDB Database
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user
4. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/ai_companion_db`)

### 2. Push to GitHub
```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit - AI Companion App"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/ai-companion.git
git push -u origin main
```

### 3. Deploy Backend Service
1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Choose "backend" folder as root directory
5. Add environment variables:
   - `MONGO_URL`: Your MongoDB Atlas connection string
   - `DB_NAME`: ai_companion_db
   - `JWT_SECRET`: Generate a secure random string
   - `EMERGENT_LLM_KEY`: sk-emergent-89e55Cb06C69eB5A3A (your existing key)
   - `CORS_ORIGINS`: https://your-frontend-url.up.railway.app
6. Deploy and note the backend URL

### 4. Deploy Frontend Service
1. Create new service in same Railway project
2. Select "frontend" folder as root directory
3. Add environment variable:
   - `REACT_APP_BACKEND_URL`: Your backend service URL from step 3
4. Deploy and note the frontend URL

### 5. Deploy WhatsApp Service
1. Create new service in same Railway project
2. Select "whatsapp-service" folder as root directory  
3. Add environment variable:
   - `FASTAPI_URL`: Your backend service URL from step 3
4. Deploy

### 6. Test Deployment
1. Visit your frontend URL
2. Register/login to test authentication
3. Check Profile → WhatsApp Integration
4. Scan QR code to test WhatsApp connection
5. Send test messages

## Environment Variables Summary

### Backend Service:
- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: ai_companion_db
- `JWT_SECRET`: Random secure string (min 32 chars)
- `EMERGENT_LLM_KEY`: sk-emergent-89e55Cb06C69eB5A3A
- `CORS_ORIGINS`: https://your-frontend-url.up.railway.app

### Frontend Service:
- `REACT_APP_BACKEND_URL`: https://your-backend-url.up.railway.app

### WhatsApp Service:
- `FASTAPI_URL`: https://your-backend-url.up.railway.app

## Cost Estimate
- **3 Railway services**: ~$5-10/month total
- **MongoDB Atlas**: Free tier (512MB)
- **Total**: ~$5-10/month

## Troubleshooting
1. If services fail to start, check logs in Railway dashboard
2. Ensure all environment variables are set correctly
3. Check that MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
4. Verify CORS origins include your frontend domain

## Post-Deployment
- WhatsApp integration should work properly in production
- Daily messages and welfare checks will be functional
- All personality features and task management ready to use