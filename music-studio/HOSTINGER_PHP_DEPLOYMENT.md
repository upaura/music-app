# UPAURA Music Studio - Hostinger Deployment Guide
# Complete guide to deploy the full-stack app on Hostinger shared hosting

## 📋 Overview

This guide covers deploying both frontend AND backend on Hostinger shared hosting using PHP.

## 🚀 Quick Deploy (5 minutes)

### Step 1: Prepare Files

1. **On your computer**, go to the project folder:
```bash
cd /Users/upaura/Desktop/code/TEST\ PROJECT\ OCT\ 2025/music-studio
```

2. **Upload these folders/files to Hostinger File Manager → public_html**:
   - `website/` folder (entire contents)
   - `website/api/` folder (contains index.php)
   - Create folders: `data/` and `uploads/` in public_html

### Step 2: Set Permissions

In Hostinger File Manager:
1. Right-click `uploads/` folder → Permissions → 755
2. Right-click `data/` folder → Permissions → 755
3. Right-click `website/api/` folder → Permissions → 755

### Step 3: Configure .htaccess

Create `.htaccess` in public_html:
```apache
DirectoryIndex index.html

# Enable PHP
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Frontend routing
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
    
    # API routing
    RewriteCond %{REQUEST_URI} ^/api/
    RewriteRule ^api/(.*)$ /api/index.php?path=$1 [L,QSA]
</IfModule>

# PHP Settings
<IfModule mod_php7.c>
    php_value upload_max_filesize 50M
    php_value post_max_size 50M
    php_value max_execution_time 300
    php_value max_input_time 300
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript
</IfModule>

# Cache headers
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType text/html "access plus 0 seconds"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### Step 4: Test Your Site

1. Go to your domain in browser
2. You should see the Music Studio homepage
3. Try registering/login - should work!
4. Try uploading a song - should work!

## 📁 Folder Structure on Hostinger

```
public_html/
├── .htaccess              # URL routing rules
├── index.html             # Main HTML file
├── styles.css             # Styles
├── app.js                 # JavaScript app
├── favicon.svg            # Icon
├── manifest.json          # PWA manifest
├── api/
│   └── index.php          # PHP Backend API
├── data/
│   └── music_studio.db    # SQLite database (auto-created)
└── uploads/               # Audio file uploads (auto-created)
```

## 🔧 Troubleshooting

### "API not found" Error
- Check that `api/` folder exists in public_html
- Verify .htaccess is uploaded
- Test: visit `yourdomain.com/api/health`

### Upload Fails
- Check folder permissions (755)
- Verify upload folder exists
- Check disk space

### Database Error
- Create `data/` folder manually
- Set permissions to 755
- File Manager will auto-create .db file

### CORS Error
- PHP API already has CORS enabled
- No action needed

### 500 Internal Server Error
- Check error logs in Hostinger
- Verify PHP version (7.4 or higher)
- Check .htaccess syntax

## 📊 Features Supported by PHP Backend

| Feature | PHP Backend | Python Backend |
|---------|-------------|----------------|
| User Registration | ✅ | ✅ |
| User Login | ✅ | ✅ |
| Upload Songs | ✅ | ✅ |
| View Songs | ✅ | ✅ |
| Beat Patterns | ✅ | ✅ |
| Collaborations | ✅ | ✅ |
| Audio Analysis | ⚠️ Basic | ✅ Full |
| Tempo Detection | ⚠️ Placeholder | ✅ Real |

## 🔐 Security Checklist

- [ ] Change JWT_SECRET in api/index.php before production
- [ ] Enable HTTPS in Hostinger (free SSL)
- [ ] Set strong database permissions
- [ ] Disable directory listing
- [ ] Regular backups

## 📈 Performance Tips

1. **Enable Cloudflare** (free CDN)
2. **Compress images** before upload
3. **Clear old uploads** periodically
4. **Monitor disk space**

## 💾 Database Management

To view/modify database:
1. Download `data/music_studio.db`
2. Use **DB Browser for SQLite** (free app)
3. Make changes
4. Upload back

## 🆘 Need Help?

1. Check Hostinger error logs
2. Test API directly: `yourdomain.com/api/health`
3. Review this guide again

