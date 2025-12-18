# OTP SMS Setup Guide

## Quick Start (Development Mode)

The server will work in development mode without Twilio - OTPs will be displayed in the console and browser alerts.

1. **Install Python packages:**
   ```powershell
   pip install -r requirements.txt
   ```

2. **Start the OTP server:**
   ```powershell
   python server.py
   ```
   The server will run on http://localhost:5000

3. **Start the web app (in another terminal):**
   ```powershell
   python -m http.server 8000
   ```
   The app will run on http://localhost:8000/shomrim_app/

4. **Test the app:**
   - Enter any phone number
   - Click Submit
   - You'll see the OTP in a popup and in the server console
   - Enter the OTP to continue

---

## Production Setup (Real SMS)

To send real SMS messages to phones:

### 1. Sign up for Twilio (Free Trial)

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account
3. Get $15 free credit (enough for ~500 SMS)
4. Verify your phone number

### 2. Get Your Credentials

From https://www.twilio.com/console:
- **Account SID** (starts with AC...)
- **Auth Token** (click to reveal)
- **Phone Number** (from Phone Numbers > Manage > Active Numbers)

### 3. Configure the Server

**Option A: Set Environment Variables (Recommended)**

PowerShell:
```powershell
$env:TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:TWILIO_AUTH_TOKEN = "your_auth_token_here"
$env:TWILIO_PHONE_NUMBER = "+1234567890"
python server.py
```

**Option B: Edit server.py directly**

Replace lines 12-14 in `server.py`:
```python
TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
TWILIO_AUTH_TOKEN = 'your_auth_token_here'
TWILIO_PHONE_NUMBER = '+1234567890'  # Your Twilio number
```

### 4. Test with Real Phone

1. Start the server: `python server.py`
2. Open the app in your browser
3. Enter your real phone number
4. You should receive the OTP via SMS!

---

## Troubleshooting

**"Make sure the backend server is running on port 5000"**
- Check if server.py is running
- Visit http://localhost:5000/health to test

**"Failed to send OTP"**
- In development mode, this is OK - check the console for the OTP
- For production, verify your Twilio credentials

**SMS not received (Twilio mode)**
- Check Twilio console for error messages
- Verify the phone number format (+countrycode + number)
- Free trial only sends to verified numbers - add numbers in Twilio console

**OTP expired**
- OTPs expire after 5 minutes
- Click "Resend OTP" to get a new code

---

## Cost (Twilio)

- **Free Trial:** $15 credit (~500 SMS)
- **Pay-as-you-go:** ~$0.0075 per SMS to US/UK
- **No monthly fees** (only pay for what you use)

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit API keys to git
- Use environment variables in production
- The `dev_otp` field is only for development - remove in production
- In production, use HTTPS (not HTTP)
- Consider rate limiting to prevent abuse

---

## Alternative SMS Providers

Instead of Twilio, you can use:
- **AWS SNS** (Amazon)
- **Vonage** (formerly Nexmo)
- **MessageBird**
- **Plivo**

Just replace the Twilio code in `server.py` with your preferred provider's API.
