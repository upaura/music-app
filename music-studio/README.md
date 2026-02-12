# 🎵 UPAURA Music Studio

A full-stack music application with upload, analysis, collaboration, and beat building features. Deploy ready for Hostinger (PHP) or Render.com (Python).

![Music Studio](https://via.placeholder.com/800x400/6366f1/ffffff?text=UPAURA+Music+Studio)

## ✨ Features

- **🔐 User Authentication** - Register, login, logout with JWT tokens
- **📤 File Upload** - Upload MP3, WAV, OGG, FLAC, M4A files
- **🎵 Audio Analysis** - Detect tempo, key, duration
- **🤝 Collaboration** - Add verses/lyrics to songs
- **🎮 Beat Builder** - Create and save beat patterns
- **💾 Data Persistence** - Songs, collaborations, patterns saved

## 🚀 Quick Deployment (Hostinger - Recommended)

**Everything on Hostinger (PHP Backend):**
1. Upload `website/` folder to public_html
2. Upload `website/api/` folder to public_html
3. Create `data/` and `uploads/` folders in public_html
4. Set permissions to 755
5. Create `.htaccess` with the rules from HOSTINGER_PHP_DEPLOYMENT.md
6. Done! 🌟

**See HOSTINGER_PHP_DEPLOYMENT.md for detailed instructions.**

## 🚀 Alternative Deployment (Python Backend)

**Backend on Render.com:**
1. Push code to GitHub
2. Create Web Service on Render.com:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn backend.app:app --bind 0.0.0.0:$PORT`
3. Set environment variables:
   - `SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
   - `DATABASE_URL`: PostgreSQL (auto-created on Render)
   - `CORS_ORIGINS`: Your Hostinger domain

**Frontend on Hostinger:**
1. Upload `website/` folder contents to `public_html`
2. Edit `website/app.js` to point to your Render backend URL
3. Done! 🌟

### Option 2: Full Stack on Render.com

1. Push to GitHub
2. Connect to Render.com
3. Set environment variables
4. Deploy automatically

### Option 3: Heroku

```bash
heroku login
heroku create your-app-name
git push heroku main
```

## 📁 Project Structure

```
music-studio/
├── backend/                 # Flask Backend API
│   ├── app.py              # Main Flask application
│   ├── models.py           # SQLAlchemy database models
│   ├── config.py           # Configuration settings
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React Frontend (alternative)
│   ├── src/
│   │   ├── pages/          # React components
│   │   └── App.js
│   └── package.json
│
├── website/               # Static HTML/CSS/JS (for Hostinger)
│   ├── index.html         # Main HTML file (SEO optimized)
│   ├── styles.css         # CSS styles
│   ├── app.js             # JavaScript application
│   ├── manifest.json       # PWA manifest
│   └── favicon.svg        # Favicon
│
├── deploy.sh              # One-click deployment script
├── HOSTINGER_DEPLOYMENT.md # Detailed Hostinger guide
├── UPLOAD_GUIDE.md        # Upload feature documentation
├── requirements.txt        # Consolidated dependencies
└── .env.example            # Environment variables template
```

## 🛠️ Technologies

### Backend
- **Flask** - Web framework
- **SQLAlchemy** - Database ORM
- **Flask-Login** - Session management
- **Flask-CORS** - Cross-origin resource sharing
- **Librosa** - Audio analysis
- **JWT** - Token-based authentication

### Frontend Options
1. **Static HTML/CSS/JS** - No dependencies, works everywhere
2. **React** - Full SPA with routing and state management

### Database
- **SQLite** (development)
- **PostgreSQL** (production)

## 🔧 Local Development

### Backend Only

```bash
cd music-studio/backend
pip install -r ../requirements.txt
python app.py
# Server runs on http://localhost:5000
```

### Static Website

```bash
cd music-studio/website
python -m http.server 8080
# Open http://localhost:8080
```

### Full React Development

```bash
cd music-studio/frontend
npm install
npm start
# Open http://localhost:3000
```

## 📱 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new user |
| POST | `/api/login` | Login user |
| POST | `/api/logout` | Logout user |
| GET | `/api/me` | Get current user |
| POST | `/api/upload` | Upload audio file |
| GET | `/api/songs` | Get user's songs |
| GET | `/api/analyze/<id>` | Analyze song |
| GET | `/api/compare/<id1>/<id2>` | Compare two songs |
| POST | `/api/collaborate/<id>` | Add verse/lyrics |
| GET | `/api/health` | Health check |

## 🔒 Environment Variables

```env
# Required for production
SECRET_KEY=your-secret-key-minimum-32-chars
DATABASE_URL=postgresql://user:pass@host:port/db
CORS_ORIGINS=https://yourdomain.com

# Optional
FLASK_ENV=production
JWT_EXPIRATION_HOURS=24
MAX_CONTENT_LENGTH=52428800
```

## 📦 Deployment Checklist

- [ ] Backend deployed and running
- [ ] Database configured (PostgreSQL for production)
- [ ] Environment variables set
- [ ] CORS configured for frontend domain
- [ ] Static website uploaded
- [ ] API URL updated in frontend
- [ ] HTTPS enabled (production)
- [ ] Health check endpoint working

## 🐛 Troubleshooting

### Port Already in Use
```bash
lsof -ti:5000 | xargs kill -9
```

### CORS Errors
- Ensure `CORS_ORIGINS` includes your frontend domain
- Don't use `*` in production

### Upload Fails
- Check file size limit (default 50MB)
- Ensure upload directory exists
- Verify file type is allowed

## 📄 License

MIT License - Feel free to use and modify!

---

**Made with ❤️ by upaura**

