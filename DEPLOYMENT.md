# Shirtify Deployment Guide

This guide explains how to deploy the **Shirtify** application to **Vercel** and **Railway**.

---

## 1. Deploying the Database & Backend to Railway

### Step 1.1: Deploy MongoDB
1. Go to [Railway](https://railway.app/) and create a new project.
2. Search for and add the **MongoDB** plugin/service to your project.
3. Railway will provision your database and expose a `MONGODB_URL` or `MONGO_URI`.

### Step 1.2: Deploy the Node.js Backend
1. Create a new service in Railway and link your GitHub repository: `MuhammadAbubakarShehzad/shirtify-frontend`.
2. Set the **Root Directory** to `backend`.
3. Add the following **Environment Variables** in Railway:
   - `MONGO_URI`: (Automatically filled when linked with the MongoDB service)
   - `JWT_SECRET`: *(A secure random string of your choice)*
   - `HF_TOKEN`: *(Your Hugging Face API token for AI generation)*
   - `PORT`: `5000`
4. Once deployed, Railway will generate a domain for your backend, such as `https://backend-production-xxxx.up.railway.app`. Keep this URL handy.

---

## 2. Deploying the Frontend & Admin Panel to Vercel

Since the frontend is static HTML/CSS/JS, we can deploy the directories directly to Vercel.

### Step 2.1: Configure the API URL
We have configured the frontend to check for a custom API URL. You can set this URL in your browser console once, or let it default to the Railway URL.
For example, open your browser developer console on the deployed site and run:
```javascript
localStorage.setItem('shirtifyApiBase', 'https://your-backend-url.up.railway.app/api');
```
*(Replace `https://your-backend-url.up.railway.app` with the actual URL Railway gives you).*

### Step 2.2: Deploy Storefront to Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Select your repository `MuhammadAbubakarShehzad/shirtify-frontend`.
3. Configure the settings:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
4. Click **Deploy**.

### Step 2.3: Deploy Admin Panel to Vercel
1. Create another project in Vercel for the same repository.
2. Configure the settings:
   - **Framework Preset**: Other
   - **Root Directory**: `admin side/frontend`
3. Click **Deploy**.

---

## 3. Local Development
For local development, everything will continue to work normally on `localhost:5000`. The code automatically detects if it is running on `localhost` and switches to the local port.
