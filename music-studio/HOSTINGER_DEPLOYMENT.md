# Hostinger Deployment Guide for Music Studio

This guide covers deploying the **static frontend** to Hostinger shared hosting. The backend requires a Python hosting platform (Render, Railway, Heroku, or Hostinger VPS).

## 📋 Prerequisites

1. **Hostinger Account** with shared hosting plan
2. **GitHub Account** for your code repository
3. **Backend deployed** on Render.com (recommended) or similar

---

## 🚀 Method 1: Deploy Static Frontend to Hostinger (Shared Hosting)

### Step 1: Prepare Your Frontend

The `website/` folder contains a standalone HTML/CSS/JS frontend that works on any web server.

```bash
cd /Users/upaura/Desktop/code/TEST PROJECT OCT 2025/music-studio
```

### Step 2: Update API URL

Edit `website/app.js` and update the API URL to point to your backend:

```javascript
// Replace this line:
const API_BASE = isLocalhost ? 'http://localhost:5000/api' : '/api';

// With your production backend URL:
const API_BASE = 'https://your-backend-app.onrender.com/api';
```

### Step 3: Upload to Hostinger

1. **Login to Hostinger** hPanel
2. **Go to File Manager** → `public_html`
3. **Upload all files** from the `website/` folder:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `favicon.svg`
   - `manifest.json`

### Step 4: Configure (If Needed)

Hostinger's shared hosting typically works out of the box with static files. If you get 404 errors:

1. Create `.htaccess` in `public_html`:
```apache
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

2. Add MIME types for audio (if needed):
```apache
AddType audio/mpeg .mp3
AddType audio/wav .wav
AddType audio/ogg .ogg
AddType audio/flac .flac
```

### Step 5: Test Your Site

Visit `https://yourdomain.com` - the Music Studio should load!

---

## 🔧 Method 2: Deploy Full Stack to Hostinger VPS

If you have Hostinger VPS (KVM), you can deploy both frontend and backend together.

### Step 1: Connect via SSH

```bash
ssh root@your-server-ip
```

### Step 2: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Python and pip
apt install -y python3 python3-pip python3-venv git

# Install Nginx
apt install -y nginx
```

### Step 3: Deploy Application

```bash
# Clone repository
cd /var/www
git clone https://github.com/yourusername/music-studio.git
cd music-studio

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env  # Edit with your values

# Create upload directory
mkdir -p backend/static/uploads
chmod 755 backend/static/uploads

# Run database migrations (if any)
```

### Step 4: Configure Nginx

Create `/etc/nginx/sites-available/music-studio`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend
    location / {
        root /var/www/music-studio/website;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static {
        alias /var/www/music-studio/backend/static;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/music-studio /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 5: Run with Systemd

Create `/etc/systemd/system/music-studio.service`:

```ini
[Unit]
Description=Music Studio Flask App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/music-studio
Environment=PATH=/var/www/music-studio/venv/bin
Environment=FLASK_ENV=production
ExecStart=/var/www/music-studio/venv/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:5000 \
    backend.app:app

Restart=always

[Install]
WantedBy=multi-user.target
```

Start the service:

```bash
systemctl daemon-reload
systemctl start music-studio
systemctl enable music-studio
```

### Step 6: Configure SSL (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 🔒 Security Checklist

- [ ] Use HTTPS (SSL certificate)
- [ ] Set strong `SECRET_KEY` (32+ characters)
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting (optional)
- [ ] Enable firewall (`ufw allow 80,443`)
- [ ] Regular backups

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Hostinger                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    public_html/                      │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │index.html│ │styles.css│ │ app.js   │ │.htaccess │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│                        (or VPS)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Nginx                              │   │
│  │  ┌──────────────────────┐ ┌──────────────────────┐  │   │
│  │  │ / (Frontend)        │ │ /api (Backend Proxy)  │  │   │
│  │  └──────────────────────┘ └──────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Gunicorn + Flask                         │   │
│  │              (Python Backend)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
              ┌───────────────────────────┐
              │    User's Browser         │
              └───────────────────────────┘
```

---

## 🆘 Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGINS` in backend config includes your frontend domain
- Example: `CORS_ORIGINS=https://yourdomain.com`

### 404 on Refresh
- Make sure `.htaccess` is correctly configured
- Check Nginx `try_files` directive

### Backend Not Accessible
- Verify backend is running: `curl http://localhost:5000/api/health`
- Check firewall: `ufw status`
- Check logs: `journalctl -u music-studio`

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running: `systemctl status postgresql`

