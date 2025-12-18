# Shomrim App - Live Server Deployment Guide

## 🌐 Deployment Options

I've prepared your app for cloud deployment. Here are the best free options:

---

## ✅ Option 1: Railway.app (RECOMMENDED - Easiest & Free)

### Step 1: Sign Up
1. Go to https://railway.app/
2. Sign up with GitHub account (free tier includes $5/month credit)

### Step 2: Deploy Backend
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account
4. Push your code to GitHub first (see instructions below)
5. Select the repository
6. Railway will auto-detect Flask and deploy!

### Step 3: Configure Environment Variables
In Railway dashboard:
- Click on your service
- Go to **Variables** tab
- Add:
  ```
  TWILIO_ACCOUNT_SID=your_account_sid
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_PHONE_NUMBER=your_phone_number
  DEBUG=False
  ```

### Step 4: Get Your Live URL
- Railway provides: `https://your-app-name.railway.app`
- Copy this URL

### Step 5: Update Frontend
Update `js/app.js` line with API_BASE_URL to point to your Railway URL

---

## ✅ Option 2: Render.com (Free Forever Tier)

### Step 1: Sign Up
1. Go to https://render.com/
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository
3. Configure:
   - **Name**: shomrim-backend
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
   - **Plan**: Free

### Step 3: Add Environment Variables
- `PORT` (Render sets this automatically)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Step 4: Deploy
- Click **"Create Web Service"**
- Wait 5-10 minutes for deployment
- Get URL: `https://shomrim-backend.onrender.com`

---

## ✅ Option 3: PythonAnywhere (Free Tier Available)

### Step 1: Sign Up
1. Go to https://www.pythonanywhere.com/
2. Create free account

### Step 2: Upload Code
1. Go to **Files** tab
2. Upload your `shomrim_app` folder
3. Or use **Git** to clone from repository

### Step 3: Setup Web App
1. Go to **Web** tab
2. Click **"Add a new web app"**
3. Select **Flask**
4. Python version: 3.10
5. Path to Flask app: `/home/yourusername/shomrim_app/server.py`

### Step 4: Configure WSGI
Edit `/var/www/yourusername_pythonanywhere_com_wsgi.py`:
```python
import sys
path = '/home/yourusername/shomrim_app'
if path not in sys.path:
    sys.path.append(path)

from server import app as application
```

### Step 5: Get URL
- Your app will be at: `https://yourusername.pythonanywhere.com`

---

## ✅ Option 4: Netlify + Backend on Railway (Best for PWA)

### Frontend (Netlify):
1. Sign up at https://www.netlify.com/
2. Drag & drop your `shomrim_app` folder (HTML/CSS/JS files only)
3. Get URL: `https://shomrim-app.netlify.app`

### Backend (Railway):
1. Follow Railway instructions above
2. Update frontend API_BASE_URL to Railway URL

---

## 🚀 Quick Start: Using Ngrok (Temporary Live URL)

For immediate testing without deployment:

### Step 1: Install Ngrok
```powershell
# Download from https://ngrok.com/download
# Or use Chocolatey:
choco install ngrok
```

### Step 2: Create Account
1. Go to https://dashboard.ngrok.com/signup
2. Sign up for free
3. Get your authtoken

### Step 3: Configure Ngrok
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 4: Expose Backend
```powershell
# In terminal 1 - Keep Flask server running
cd c:\Users\shoel\Downloads\shomrim\shomrim_app
python server.py

# In terminal 2 - Start ngrok
ngrok http 5000
```

### Step 5: Expose Frontend
```powershell
# In terminal 3 - Keep frontend running
cd c:\Users\shoel\Downloads\shomrim
python -m http.server 8000

# In terminal 4 - Start ngrok for frontend
ngrok http 8000
```

### Step 6: Get Your Live URLs
Ngrok will display:
```
Backend: https://abc123.ngrok-free.app
Frontend: https://xyz789.ngrok-free.app
```

### Step 7: Update API URL
In `js/app.js`, update:
```javascript
const API_BASE_URL = 'https://abc123.ngrok-free.app';
```

**Note**: Ngrok free tier URLs change every time you restart. For permanent URLs, upgrade or use cloud deployment.

---

## 📦 Preparing for GitHub Deployment

### Step 1: Initialize Git Repository
```powershell
cd c:\Users\shoel\Downloads\shomrim\shomrim_app
git init
git add .
git commit -m "Initial commit - Shomrim App"
```

### Step 2: Create GitHub Repository
1. Go to https://github.com/new
2. Name: `shomrim-app`
3. Don't initialize with README (you already have code)
4. Click **"Create repository"**

### Step 3: Push Code
```powershell
git remote add origin https://github.com/YOUR_USERNAME/shomrim-app.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy to Railway/Render
Now you can connect your GitHub repo to Railway or Render!

---

## 🔧 Files Prepared for Deployment

I've already created these files for you:

1. **Procfile** - Tells cloud platform how to start your app
   ```
   web: python server.py
   ```

2. **runtime.txt** - Specifies Python version
   ```
   python-3.11.0
   ```

3. **requirements.txt** - Already exists with dependencies

4. **server.py** - Updated to use PORT environment variable

---

## 🌍 Recommended Setup for Production

**Best Configuration**:
- **Frontend**: Netlify (Free, Fast CDN, Auto HTTPS)
- **Backend**: Railway (Free $5/month credit, Auto scaling)
- **Database**: SQLite (included) or upgrade to PostgreSQL

### Why This Setup?
- ✅ 100% Free (within limits)
- ✅ Automatic HTTPS
- ✅ Auto-scaling
- ✅ CI/CD from GitHub
- ✅ Easy to manage
- ✅ Professional URLs

---

## 🔐 Security Checklist Before Going Live

1. **Environment Variables**:
   - Never commit API keys to GitHub
   - Use platform's environment variable settings
   - Add `.env` to `.gitignore`

2. **Database**:
   - Current SQLite works for testing
   - For production, consider PostgreSQL (Railway/Render offer free tiers)

3. **CORS**:
   - Currently allows all origins
   - Update to only allow your frontend domain:
   ```python
   CORS(app, origins=['https://shomrim-app.netlify.app'])
   ```

4. **Debug Mode**:
   - Set `DEBUG=False` in production
   - Already configured in updated server.py

---

## 📱 After Deployment

### Update Frontend API URL
Edit `c:\Users\shoel\Downloads\shomrim\shomrim_app\js\app.js`:

Find this line (around line 13):
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'http://192.168.1.80:5000';
```

Replace with:
```javascript
const API_BASE_URL = 'https://your-backend-url.railway.app';
```

### Test Your Live App
1. Open your live URL on any device
2. Register a new user
3. Create an incident
4. Verify database persistence
5. Test all features

---

## 💡 Which Option Should You Choose?

### For Quick Testing (Right Now):
**Use Ngrok** - Get live URLs in 2 minutes

### For Production (Permanent):
**Use Railway** (Backend) + **Netlify** (Frontend) - Best free option

### For Enterprise:
Consider paid hosting on AWS, Azure, or DigitalOcean

---

## 🆘 Need Help?

1. **Choose Ngrok for immediate testing** - Fastest way to get live URLs
2. **Choose Railway for permanent deployment** - Best free platform
3. **I can help you set up any of these options!**

Let me know which option you prefer, and I'll guide you through the specific steps!

---

**Current Status**:
- ✅ Files prepared for deployment
- ✅ Server configured for cloud platforms
- ✅ Database ready
- ✅ All features working locally
- ⏳ Ready to deploy - choose your platform!
