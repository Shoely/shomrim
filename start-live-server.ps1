# Shomrim App - Start Live Servers with Ngrok
# This script creates public URLs for your local servers

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   SHOMRIM APP - LIVE SERVER SETUP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if ngrok is installed
$ngrokPath = "$env:LOCALAPPDATA\ngrok\ngrok.exe"
if (-not (Test-Path $ngrokPath)) {
    Write-Host "❌ Ngrok not found. Installing..." -ForegroundColor Yellow
    
    $ngrokUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
    $downloadPath = "$env:TEMP\ngrok.zip"
    $extractPath = "$env:LOCALAPPDATA\ngrok"
    
    Invoke-WebRequest -Uri $ngrokUrl -OutFile $downloadPath
    New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
    Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
    Remove-Item $downloadPath
    
    Write-Host "✅ Ngrok installed successfully!`n" -ForegroundColor Green
}

Write-Host "📝 SETUP INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Sign up for free at: https://dashboard.ngrok.com/signup" -ForegroundColor White
Write-Host "2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host "3. Run this command with your token:`n" -ForegroundColor White
Write-Host "   $ngrokPath config add-authtoken YOUR_AUTH_TOKEN`n" -ForegroundColor Cyan

Write-Host "4. Then run these commands in separate terminals:`n" -ForegroundColor White

Write-Host "   Terminal 1 - Backend Server:" -ForegroundColor Green
Write-Host "   cd c:\Users\shoel\Downloads\shomrim\shomrim_app" -ForegroundColor Gray
Write-Host "   python server.py`n" -ForegroundColor Gray

Write-Host "   Terminal 2 - Frontend Server:" -ForegroundColor Green
Write-Host "   cd c:\Users\shoel\Downloads\shomrim" -ForegroundColor Gray
Write-Host "   python -m http.server 8000`n" -ForegroundColor Gray

Write-Host "   Terminal 3 - Ngrok Backend Tunnel:" -ForegroundColor Green
Write-Host "   $ngrokPath http 5000`n" -ForegroundColor Gray

Write-Host "   Terminal 4 - Ngrok Frontend Tunnel:" -ForegroundColor Green
Write-Host "   $ngrokPath http 8000`n" -ForegroundColor Gray

Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "🚀 QUICK START ALTERNATIVE - Deploy to Railway.app (Recommended):`n" -ForegroundColor Magenta
Write-Host "1. Go to https://railway.app/" -ForegroundColor White
Write-Host "2. Sign up with GitHub" -ForegroundColor White
Write-Host "3. Push your code to GitHub (see DEPLOYMENT_GUIDE.md)" -ForegroundColor White
Write-Host "4. Deploy from GitHub repo - Railway auto-detects Flask!" -ForegroundColor White
Write-Host "5. Get your live URL: https://your-app.railway.app`n" -ForegroundColor White

Write-Host "📖 Full deployment guide: c:\Users\shoel\Downloads\shomrim\shomrim_app\DEPLOYMENT_GUIDE.md`n" -ForegroundColor Cyan

# Ask user which option they want
Write-Host "Which option do you prefer?" -ForegroundColor Yellow
Write-Host "[1] Use Ngrok (temporary URLs, works immediately)" -ForegroundColor White
Write-Host "[2] Deploy to Railway (permanent URLs, requires GitHub)" -ForegroundColor White
Write-Host "[3] Show me the manual steps only`n" -ForegroundColor White

$choice = Read-Host "Enter your choice (1, 2, or 3)"

switch ($choice) {
    "1" {
        Write-Host "`n✅ Starting Ngrok setup..." -ForegroundColor Green
        Write-Host "Opening terminals for you...`n" -ForegroundColor Cyan
        
        # Check if servers are already running
        $flaskRunning = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*python*' }
        
        if (-not $flaskRunning) {
            Write-Host "Starting Flask server..." -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\Users\shoel\Downloads\shomrim\shomrim_app; python server.py"
            Start-Sleep -Seconds 3
        }
        
        Write-Host "Starting Ngrok tunnel for backend (port 5000)..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "$ngrokPath http 5000 --log=stdout"
        
        Start-Sleep -Seconds 2
        
        Write-Host "`n✅ Ngrok is running!" -ForegroundColor Green
        Write-Host "Check the terminal windows for your public URLs`n" -ForegroundColor Cyan
        Write-Host "Copy the HTTPS URL from the ngrok terminal (e.g., https://abc123.ngrok-free.app)" -ForegroundColor White
        Write-Host "Then update js/app.js with your backend URL`n" -ForegroundColor White
    }
    "2" {
        Write-Host "`n📦 Preparing for Railway deployment..." -ForegroundColor Green
        Write-Host "Follow these steps:`n" -ForegroundColor Cyan
        Write-Host "1. Initialize Git repository:" -ForegroundColor Yellow
        Write-Host "   cd c:\Users\shoel\Downloads\shomrim\shomrim_app" -ForegroundColor Gray
        Write-Host "   git init" -ForegroundColor Gray
        Write-Host "   git add ." -ForegroundColor Gray
        Write-Host "   git commit -m 'Initial commit - Shomrim App'`n" -ForegroundColor Gray
        
        Write-Host "2. Create GitHub repo at https://github.com/new`n" -ForegroundColor Yellow
        
        Write-Host "3. Push code:" -ForegroundColor Yellow
        Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/shomrim-app.git" -ForegroundColor Gray
        Write-Host "   git branch -M main" -ForegroundColor Gray
        Write-Host "   git push -u origin main`n" -ForegroundColor Gray
        
        Write-Host "4. Deploy on Railway:" -ForegroundColor Yellow
        Write-Host "   - Go to https://railway.app/" -ForegroundColor Gray
        Write-Host "   - New Project → Deploy from GitHub" -ForegroundColor Gray
        Write-Host "   - Select your repository" -ForegroundColor Gray
        Write-Host "   - Railway auto-deploys!`n" -ForegroundColor Gray
        
        Write-Host "Full guide: DEPLOYMENT_GUIDE.md`n" -ForegroundColor Cyan
    }
    "3" {
        Write-Host "`n📖 Manual setup instructions are in:" -ForegroundColor Cyan
        Write-Host "c:\Users\shoel\Downloads\shomrim\shomrim_app\DEPLOYMENT_GUIDE.md`n" -ForegroundColor White
    }
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again.`n" -ForegroundColor Red
    }
}

Write-Host "========================================`n" -ForegroundColor Cyan
