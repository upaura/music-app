#!/bin/bash
# Music Studio - One-Click Deployment Script
# Deploy frontend to Hostinger, backend to Render.com

set -e  # Exit on error

echo "🎵 Music Studio Deployment Script"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if git is available
if ! command -v git &> /dev/null; then
    log_error "Git is not installed. Please install Git first."
    exit 1
fi

# Check if Node.js is available (for React build)
if command -v node &> /dev/null; then
    log_info "Node.js found: $(node --version)"
    HAS_NODE=true
else
    log_warn "Node.js not found (needed only if building React frontend)"
    HAS_NODE=false
fi

echo ""
echo "Please select deployment target:"
echo "1. Deploy static frontend to Hostinger (recommended)"
echo "2. Deploy full stack to Render.com"
echo "3. Build React frontend for deployment"
echo "4. Run local development servers"
echo "5. Test API connection"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to Hostinger..."
        echo ""
        
        # Check if website files exist
        if [ ! -d "website" ]; then
            log_error "website/ directory not found!"
            exit 1
        fi
        
        # Get backend API URL
        echo "Enter your backend API URL (e.g., https://your-app.onrender.com/api):"
        read -r API_URL
        
        if [ -z "$API_URL" ]; then
            log_warn "No API URL provided. Using default."
            API_URL="https://your-backend-app.onrender.com/api"
        fi
        
        # Update app.js with API URL
        if [ -f "website/app.js" ]; then
            # Backup original
            cp website/app.js website/app.js.backup
            
            # Replace API URL
            sed -i "s|const API_BASE = getApiBaseUrl();|const API_BASE = '$API_URL';|g" website/app.js
            log_info "Updated API URL in website/app.js"
        fi
        
        echo ""
        echo "📦 Files to upload to Hostinger public_html/:"
        echo "   - index.html"
        echo "   - styles.css"
        echo "   - app.js"
        echo "   - favicon.svg"
        echo "   - manifest.json"
        echo ""
        
        # Create deployment package
        echo "Creating deployment package..."
        mkdir -p deploy-package
        cp website/* deploy-package/
        tar -czf music-studio-frontend.tar.gz -C deploy-package .
        rm -rf deploy-package
        
        log_info "Created: music-studio-frontend.tar.gz"
        echo ""
        echo "📤 Upload these files to Hostinger public_html/:"
        echo "   1. Extract the archive"
        echo "   2. Upload all files to public_html/"
        echo "   3. Test your site at https://yourdomain.com"
        ;;
        
    2)
        echo ""
        echo "🚀 Deploying to Render.com..."
        echo ""
        
        echo "1. Push your code to GitHub:"
        echo "   git add ."
        echo "   git commit -m 'Prepare for deployment'"
        echo "   git push origin main"
        echo ""
        
        echo "2. Create a new Web Service on Render.com:"
        echo "   - Connect your GitHub repository"
        echo "   - Build Command: pip install -r requirements.txt"
        echo "   - Start Command: gunicorn backend.app:app --bind 0.0.0.0:\$PORT"
        echo ""
        
        echo "3. Set environment variables in Render dashboard:"
        echo "   - SECRET_KEY: $(python3 -c "import secrets; print(secrets.token_hex(32))")"
        echo "   - DATABASE_URL: (auto-created with PostgreSQL)"
        echo "   - CORS_ORIGINS: https://yourdomain.com"
        echo "   - FLASK_ENV: production"
        echo ""
        
        echo "4. Deploy frontend to Hostinger using option 1"
        echo ""
        
        log_info "See HOSTINGER_DEPLOYMENT.md for detailed instructions"
        ;;
        
    3)
        if [ "$HAS_NODE" = false ]; then
            log_error "Node.js is required to build the React frontend"
            exit 1
        fi
        
        echo ""
        echo "🔨 Building React frontend..."
        echo ""
        
        cd frontend
        npm install
        npm run build
        
        log_info "Build complete!"
        echo ""
        echo "📦 Built files are in: frontend/build/"
        echo "Upload contents to Hostinger public_html/"
        ;;
        
    4)
        echo ""
        echo "🚀 Starting local development servers..."
        echo ""
        
        # Start backend
        echo "Starting backend on port 5000..."
        cd backend
        pip install -q -r ../requirements.txt
        python app.py &
        BACKEND_PID=$!
        
        # Start frontend
        echo "Starting frontend on port 8080..."
        cd ../website
        python -m http.server 8080 &
        FRONTEND_PID=$!
        
        echo ""
        echo "✅ Servers started:"
        echo "   Frontend: http://localhost:8080"
        echo "   Backend:  http://localhost:5000/api"
        echo ""
        echo "Press Ctrl+C to stop..."
        
        # Wait for user interrupt
        trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
        wait
        ;;
        
    5)
        echo ""
        echo "🔍 Testing API connection..."
        echo ""
        
        echo "Enter backend URL (default: http://localhost:5000):"
        read -r BACKEND_URL
        
        if [ -z "$BACKEND_URL" ]; then
            BACKEND_URL="http://localhost:5000"
        fi
        
        echo ""
        echo "Testing health endpoint..."
        curl -s "${BACKEND_URL}/api/health" | python3 -m json.tool 2>/dev/null || curl -s "${BACKEND_URL}/api/health"
        echo ""
        
        log_info "Test complete"
        ;;
        
    *)
        echo "Invalid choice. Please select 1-5."
        exit 1
        ;;
esac

echo ""
echo "=================================="
echo "✨ Deployment script completed!"

