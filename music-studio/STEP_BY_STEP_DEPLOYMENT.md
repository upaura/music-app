# 🚀 COMPLETE DEPLOYMENT GUIDE - DO EXACTLY THESE STEPS

## STEP 1: PUSH CODE TO GITHUB

### 1.1 Open Terminal on your Mac
```bash
cd /Users/upaura/Desktop/code/TEST\ PROJECT\ OCT\ 2025/music-studio
```

### 1.2 Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Initial commit - Music Studio"
```

### 1.3 Create GitHub Repository
1. Go to **github.com** in your browser
2. Click **+** (top right) → **New repository**
3. Name: `music-studio`
4. Make it **Public**
5. Click **Create repository**
6. Copy the 2 lines shown (they look like `git remote add...`)

### 1.4 Push to GitHub (in Terminal)
Paste those 2 lines you copied, then:
```bash
git push -u origin main
```

---

## STEP 2: DEPLOY BACKEND TO RENDER.COM

### 2.1 Create Web Service on Render
1. Go to **dashboard.render.com**
2. Click **New +** → **Web Service**
3. Click **Connect your GitHub account**
4. Find and select the `music-studio` repository
5. Configure these settings:

| Setting | Value |
|---------|-------|
| **Name** | `music-studio-backend` |
| **Root Directory** | (leave empty) |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn backend.app:app --bind 0.0.0.0:$PORT` |
| **Plan** | Free |

### 2.2 Add Environment Variables
Scroll down to "Environment Variables" and add:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | `upaura-secret-key-12345-abcdefghij` |
| `DATABASE_URL` | (will be auto-created) |
| `CORS_ORIGINS` | `https://yourdomain.com` |
| `FLASK_ENV` | `production` |

**To create SECRET_KEY**, in Terminal run:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```
Copy the result and paste it.

### 2.3 Create Database
1. In Render dashboard, click **New +** → **PostgreSQL**
2. Name: `music-studio-db`
3. Click **Create Database**
4. After created, copy the **Internal Database URL**

### 2.4 Connect Database to Backend
1. Go to your **Web Service** (music-studio-backend)
2. Click **Environment**
3. Add this variable:
   - Key: `DATABASE_URL`
   - Value: Paste the Internal Database URL from step 2.3

### 2.5 Deploy
1. Click **Create Web Service**
2. Wait 2-5 minutes for deployment
3. Look for a URL like: `https://music-studio-backend.onrender.com`
4. **TEST IT**: Visit that URL + `/api/health`
   - Example: `https://music-studio-backend.onrender.com/api/health`
   - You should see: `{"status":"healthy"}`

---

## STEP 3: DEPLOY FRONTEND TO HOSTINGER

### 3.1 Update API URL
Edit `website/app.js`:
- Find the line with `API_BASE`
- Change it to your Render backend URL

```javascript
// Change this:
const API_BASE = 'http://localhost:5000/api';

// To this (your Render URL):
const API_BASE = 'https://music-studio-backend.onrender.com/api';
```

### 3.2 Upload to Hostinger
1. Go to **hpanel.hostinger.com**
2. Click **File Manager** → **public_html**
3. Upload these files from `website/` folder:
   - [x] index.html
   - [x] styles.css
   - [x] app.js
   - [x] favicon.svg
   - [x] manifest.json

### 3.3 Test Frontend
1. Go to your domain
2. Try registering a new account
3. Try logging in
4. Try uploading a song

---

## STEP 4: FIX COMMON ISSUES

### Issue: "CORS Error" in browser console
**Fix:** In Render dashboard, add your domain to CORS_ORIGINS:
- Go to Environment Variables
- Add: `CORS_ORIGINS` = `https://yourdomain.com,https://www.yourdomain.com`

### Issue: "Database Connection Failed"
**Fix:** 
- Make sure PostgreSQL is created in Render
- Make sure DATABASE_URL is set in Web Service environment

### Issue: Upload fails
**Fix:** In Render, increase timeout:
- Environment Variable: `MAX_CONTENT_LENGTH` = `52428800`

### Issue: Website shows "Loading..." forever
**Fix:** Check browser console (F12)
- If CORS error → fix CORS_ORIGINS
- If 404 error → API URL is wrong

---

## ✅ QUICK TEST CHECKLIST

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Render Web Service created
- [ ] PostgreSQL database created
- [ ] DATABASE_URL set in environment
- [ ] Backend URL works (visit /api/health)
- [ ] Frontend files uploaded to Hostinger
- [ ] Registration works
- [ ] Login works
- [ ] Upload works

---

## 🔗 IMPORTANT URLs

| What | URL |
|------|-----|
| GitHub Repository | https://github.com/YOURUSERNAME/music-studio |
| Backend (Render) | https://music-studio-backend.onrender.com |
| Frontend (Hostinger) | https://yourdomain.com |
| API Health Test | https://music-studio-backend.onrender.com/api/health |

