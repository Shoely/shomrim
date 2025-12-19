# Shomrim App

A community safety patrol application with real-time incident management and push-to-talk communication.

## Features
- OTP-based authentication
- Incident tracking and management
- Push-to-Talk (PTT) voice communication
- User management and role-based access
- Mobile-friendly responsive design

## Deployment

This app is configured for easy deployment to platforms like Render, Heroku, or Railway.

### Environment Variables
Set these in your deployment platform:
- `TWILIO_ACCOUNT_SID` (optional - for SMS OTP)
- `TWILIO_AUTH_TOKEN` (optional - for SMS OTP)
- `TWILIO_PHONE_NUMBER` (optional - for SMS OTP)

## Local Development
1. Install dependencies: `pip install -r requirements.txt`
2. Run server: `python server.py`
3. Access at: `http://localhost:5000`
