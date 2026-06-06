@echo off
cd /d "%~dp0"
title Shirtify Unified Platform Starter
echo ===================================================
echo 🚀 Starting Shirtify Unified Platform...
echo ===================================================
echo.

:: 1. Start Node.js Backend
echo [1/3] Starting Node.js Backend (Port 5000)...
start "Shirtify Node.js Backend" cmd /k "node backend/server.js"

:: 2. Start Python ML Service
echo [2/3] Starting Python ML Service (Port 5050)...
cd "admin side\backend\ml_service"
start "Shirtify Python ML Service" cmd /k ".venv\Scripts\python.exe app.py"
cd ..\..\..

:: 3. Start Python Try-On Service
echo [3/3] Starting Python Try-On Service (Port 5001)...
cd "frontend\New folder"
start "Shirtify Python Try-On Service" cmd /k "..\..\.venv\Scripts\python.exe tryon_pipeline.py"
cd ..\..

echo.
echo ===================================================
echo ✅ All three servers are starting in separate windows!
echo 🛍️  Storefront:   http://localhost:5000/
echo ⚙️  Admin Panel:  http://localhost:5000/admin/
echo 🤳 Try-On Screen: http://localhost:5000/try-on-screen/try-on-screen.html
echo 💻 Live Server:  http://127.0.0.1:5500/admin%%20side/frontend/admin/predict.html
echo ===================================================
pause
