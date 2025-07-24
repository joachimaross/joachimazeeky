# 🚀 Zeeky AI - Complete Setup Guide

This guide will walk you through setting up and deploying your advanced Zeeky AI assistant.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 16+** installed ([Download here](https://nodejs.org/))
- **Git** installed ([Download here](https://git-scm.com/))
- A **Firebase account** ([Sign up here](https://firebase.google.com/))
- API keys from various services (detailed below)

## 🔧 Step 1: Environment Setup

### 1.1 Clone and Install

```bash
git clone https://github.com/joachimaross/joachimazeeky.git
cd joachimazeeky
npm install
```

### 1.2 Create Environment File

```bash
cp .env.example .env
```

Open `.env` in your text editor and fill in the required values:

## 🔑 Step 2: API Key Configuration

### 2.1 Firebase Setup (Required)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called "Zeeky AI"
3. Enable **Authentication** with Email/Password and Google
4. Enable **Firestore Database**
5. Go to Project Settings → General → Your apps
6. Copy the configuration values to your `.env` file:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 2.2 OpenAI API (Required for AI Features)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env`:

```env
REACT_APP_OPENAI_API_KEY=sk-your_openai_key_here
```

### 2.3 Google Gemini API (Optional)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env`:

```env
REACT_APP_GEMINI_API_KEY=your_gemini_key_here
```

### 2.4 Suno AI API (Optional - for music generation)

1. Go to [Suno AI API](https://suno.ai/api)
2. Sign up and get your API key
3. Add to `.env`:

```env
REACT_APP_SUNO_API_KEY=your_suno_key_here
```

### 2.5 Weather API (Optional)

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up and get your API key
3. Add to `.env`:

```env
REACT_APP_WEATHER_API_KEY=your_weather_key_here
```

## 🏃‍♂️ Step 3: Development Testing

### 3.1 Start Development Server

```bash
npm start
```

Your app will open at `http://localhost:3000`

### 3.2 Test Core Features

1. **Authentication**: Try signing up with email or Google
2. **Voice Recognition**: Click the microphone and speak
3. **Avatar Animation**: Watch the holographic avatar respond
4. **AI Chat**: Send messages and test different personas
5. **Live Tiles**: Check the dashboard functionality

## 🚀 Step 4: Production Deployment

### 4.1 Automatic Deployment (Recommended)

Run our deployment script:

```bash
./deploy.sh
```

Follow the prompts to:
- Choose your hosting platform (Netlify recommended)
- Automatically build and deploy
- Set up domain and SSL

### 4.2 Manual Deployment Options

#### Option A: Netlify

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Build: `npm run build`
3. Deploy: `netlify deploy --prod --dir=build`

#### Option B: Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel --prod`

#### Option C: Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize: `firebase init hosting`
3. Build: `npm run build`
4. Deploy: `firebase deploy --only hosting`

## 🔧 Step 5: Advanced Configuration

### 5.1 Custom Domain Setup

After deployment, configure your custom domain:

1. **Netlify**: Dashboard → Domain management → Add custom domain
2. **Vercel**: Dashboard → Domains → Add domain
3. **Firebase**: Hosting → Connect custom domain

### 5.2 SSL Certificate

Most platforms provide automatic SSL. If not:

1. Enable HTTPS in your hosting platform
2. Update your Firebase auth domain
3. Test all authentication flows

### 5.3 Performance Optimization

Add these to your `.env` for production:

```env
GENERATE_SOURCEMAP=false
REACT_APP_ENVIRONMENT=production
```

## 📊 Step 6: Monitoring & Analytics

### 6.1 Google Analytics (Optional)

1. Create a Google Analytics property
2. Add tracking ID to `.env`:

```env
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
```

### 6.2 Error Tracking with Sentry (Optional)

1. Sign up for [Sentry](https://sentry.io/)
2. Create a new project
3. Add DSN to `.env`:

```env
REACT_APP_SENTRY_DSN=your_sentry_dsn_here
```

## 🧪 Step 7: Testing Guide

### 7.1 Voice Features Test

1. Click microphone button
2. Say "Hello Zeeky, how are you?"
3. Verify avatar responds with voice and animation

### 7.2 Persona Switching Test

1. Click persona button in chat
2. Switch to "Coach Zeeky"
3. Ask "motivate me to work out"
4. Verify personality change in response

### 7.3 Music Generation Test

1. Go to Music Lab tile
2. Enter prompt: "upbeat pop song about success"
3. Verify music generation starts

### 7.4 Business CRM Test (if applicable)

1. Navigate to Business Tools
2. Add a test client
3. Create a job estimate
4. Verify all calculations work

## 🐛 Troubleshooting

### Common Issues

#### Voice Not Working
- Check browser permissions for microphone
- Ensure HTTPS is enabled (required for voice API)
- Test in Chrome/Edge (best compatibility)

#### Avatar Not Displaying
- Check browser console for errors
- Ensure webcam permissions are granted
- Verify Canvas support in browser

#### Firebase Errors
- Double-check all Firebase environment variables
- Ensure Firebase project is active
- Verify authentication methods are enabled

#### API Errors
- Check API key validity and quotas
- Verify CORS settings for external APIs
- Check network connectivity

### Performance Issues

#### Slow Loading
- Check bundle size: `npm run build && npx bundlemon`
- Enable code splitting
- Optimize images and assets

#### Memory Issues
- Monitor browser dev tools Performance tab
- Check for memory leaks in avatar animations
- Reduce concurrent AI API calls

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set
3. Test with different browsers
4. Review the Firebase console for authentication issues

## 🎯 Next Steps After Deployment

1. **Test thoroughly** on different devices and browsers
2. **Set up monitoring** to track usage and errors
3. **Configure backups** for your Firebase data
4. **Plan scaling** for increased user load
5. **Add custom features** specific to your needs

## 🔒 Security Checklist

- [ ] All API keys are in `.env` (not in code)
- [ ] `.env` is in `.gitignore`
- [ ] Firebase security rules are configured
- [ ] HTTPS is enabled on production
- [ ] Authentication is working properly
- [ ] CORS is properly configured

---

## 🎉 Congratulations!

Your Zeeky AI assistant is now live! You've deployed the most advanced emotionally intelligent AI assistant with:

- 🤖 Holographic avatar with facial animations
- 🧠 Multiple AI personas with memory
- 🎤 Voice recognition and synthesis
- 🎵 AI music generation
- 💼 Business CRM capabilities
- 📱 Responsive design for all devices

**Built by Joachima Ross, CEO of Zeeky AI - Chicago, IL**

Ready for the future of AI assistance! 🚀