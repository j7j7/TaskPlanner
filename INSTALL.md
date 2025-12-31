# Installation & Self-Hosting Guide

This guide covers how to install TaskPlanner locally and host it on your own infrastructure.

## Prerequisites

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js) or **pnpm** (`npm install -g pnpm`)
- **InstantDB Account** - Free at [instantdb.com](https://instantdb.com)

---

## Step 1: Create InstantDB Account

### 1.1 Sign Up

1. Go to [https://instantdb.com](https://instantdb.com)
2. Click "Sign Up" or "Get Started"
3. Create an account using GitHub or email

### 1.2 Create Your App

1. Once logged in, you'll see the InstantDB dashboard
2. Click **"Create New App"**
3. Enter an app name (e.g., `taskplanner-production`)
4. Click **"Create App"**

### 1.3 Get Your App ID

1. In your app dashboard, look for **"App ID"** or navigate to Settings
2. Copy the App ID - it looks like: `2f38c7f1-228e-4767-85d1-f96a6cbb5cb5`
3. This is your unique identifier for database connections

### 1.4 Configure Email Auth (Optional)

1. In InstantDB dashboard, go to **Authentication** settings
2. Enable email magic codes if not already enabled
3. Configure your email domain if using custom email

---

## Step 2: Clone & Setup the Project

```bash
# Clone the repository
git clone https://github.com/yourusername/todo.git
cd todo

# Install dependencies
npm install

# Or using pnpm
pnpm install
```

---

## Step 3: Configure Environment Variables

### 3.1 Create Environment File

```bash
# Copy the example file
cp .env.example .env
```

### 3.2 Edit .env File

Open `.env` in your editor and update the InstantDB App ID:

```env
# InstantDB Configuration
# Get your APP_ID from https://instantdb.com/dash?t=explorer

# Your InstantDB App ID (must start with VITE_ for Vite to expose it)
VITE_INSTANT_APP_ID=2f38c7f1-228e-4767-85d1-f96a6cbb5cb5

# Node environment
NODE_ENV=development
```

**Important:**
- Replace `2f38c7f1-228e-4767-85d1-f96a6cbb5cb5` with your actual App ID
- The `VITE_` prefix is required - Vite only exposes variables starting with this prefix
- Never share your App ID publicly

---

## Step 4: Run Locally

### Development Mode

```bash
# Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**

### Quick Start Script

```bash
# Uses the start script (clears cache and restarts)
./start.sh
```

---

## Step 5: Build for Production

### Build the Application

```bash
# Build for production
npm run build

# Or build faster (skip type checking)
npm run build:fast
```

The production build will be in the `dist/` folder.

### Preview Production Build

```bash
# Preview locally
npm run preview

# Or with production mode
npm run preview:prod
```

---

## Step 6: Hosting Options

### Option A: Vercel (Recommended for Ease)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite/React projects

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add: `VITE_INSTANT_APP_ID` = your App ID
   - Add: `NODE_ENV` = `production`

4. **Deploy**
   - Vercel will auto-deploy
   - Your app will be at `https://your-project.vercel.app`

### Option B: Netlify

1. **Push to GitHub** (same as above)

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: `/`

4. **Configure Environment Variables**
   - In Site Settings → Environment Variables
   - Add: `VITE_INSTANT_APP_ID` = your App ID

5. **Deploy**
   - Netlify will auto-deploy
   - Your app will be at `https://random-name.netlify.app`

### Option C: Docker

1. **Create Dockerfile**

Create `Dockerfile` in the project root:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. **Create nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

3. **Build & Run**

```bash
# Build the image
docker build -t taskplanner .

# Run the container
docker run -p 80:80 taskplanner
```

4. **Your app will be at http://localhost**

### Option D: Traditional Server (Node.js + Nginx)

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Install PM2 for Process Management**
   ```bash
   npm install -g pm2
   ```

3. **Start the Production Server**
   ```bash
   # Serve the dist folder with a simple server
   npm install -g serve
   pm2 start serve --name taskplanner -- /path/to/dist -p 3000 -s
   ```

4. **Configure Nginx**

```nginx
server {
    server_name your-domain.com;
    listen 80;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    server_name your-domain.com;
    listen 443 ssl;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Optional: API proxy if using backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Setup SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## Step 7: Production Environment Variables

When deploying to production, ensure these environment variables are set:

```env
# Required
VITE_INSTANT_APP_ID=your_actual_app_id_here

# Optional
NODE_ENV=production
```

**Where to set environment variables:**

| Platform | Location |
|----------|----------|
| Vercel | Project Settings → Environment Variables |
| Netlify | Site Settings → Environment Variables |
| Docker | `-e VITE_INSTANT_APP_ID=...` in run command |
| Traditional Server | `.env` file or systemd service environment |

---

## Step 8: Verify Installation

1. **Check the App Loads**
   - Open your hosted URL
   - You should see the TaskPlanner login page

2. **Test InstantDB Connection**
   - Open browser DevTools (F12)
   - Go to Console
   - If InstantDB connects successfully, you won't see warnings
   - If misconfigured, you'll see: `VITE_INSTANT_APP_ID must be set in .env`

3. **Test Authentication**
   - Try registering a new account
   - Check InstantDB dashboard for new user data

---

## InstantDB Dashboard Features

Once your app is running, you can:

- **View Data**: Go to Explorer to see all boards, cards, and users
- **Manage Schema**: View and modify your data schema
- **API Access**: Get API keys for advanced usage
- **Analytics**: Monitor usage and operations

---

## Troubleshooting

### "VITE_INSTANT_APP_ID must be set in .env"

1. Check your `.env` file exists in project root
2. Verify App ID is correct (no spaces, proper UUID format)
3. Restart dev server after changing `.env`
4. For production: ensure environment variable is set in hosting platform

### Build Fails

1. Ensure Node.js 18+ is installed: `node --version`
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npm run typecheck` (if available)

### Authentication Not Working

1. Verify email auth is enabled in InstantDB dashboard
2. Check spam folder for magic code emails
3. Ensure App ID matches in both frontend and InstantDB dashboard

### Styles Not Loading in Production

1. Ensure build completed without errors
2. Check `dist/index.html` exists
3. Verify nginx config has `try_files $uri $uri/ /index.html`

---

## Security Considerations

1. **App ID Visibility**: InstantDB App IDs are not secret, but treat them as semi-sensitive
2. **Authentication**: Uses email magic codes - ensure your email provider is secure
3. **HTTPS**: Always use HTTPS in production (automatic on Vercel/Netlify)
4. **Rate Limits**: InstantDB has built-in rate limiting

---

## Updating Your Deployment

To update a deployed version:

```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run build

# For traditional servers, restart the process
pm2 restart taskplanner
```

---

## Support

- InstantDB Documentation: https://docs.instantdb.com
- InstantDB Dashboard: https://instantdb.com/dash
- InstantDB Discord: https://discord.gg/instantdb
