$headers = @{
    'Content-Type' = 'application/json'
}

# Test 1: Health Check
Write-Host "=== Testing Backend Health ===" -ForegroundColor Green
$health = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method Get
Write-Host $health.Content

# Test 2: Feedback Endpoint
Write-Host "`n=== Testing Feedback Endpoint ===" -ForegroundColor Green
$feedbackData = @{
    userId = "test-user"
    productId = "prod-123"
    userRating = 5
    feedback = "Great product recommendation!"
} | ConvertTo-Json

try {
    $feedback = Invoke-WebRequest -Uri "http://localhost:5000/api/ml/feedback" -Method Post -Headers $headers -Body $feedbackData
    Write-Host $feedback.Content -ForegroundColor Green
} catch {
    Write-Host "Feedback endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 3: Training Status
Write-Host "`n=== Testing Training Status ===" -ForegroundColor Green
try {
    $status = Invoke-WebRequest -Uri "http://localhost:5000/api/ml/training-status" -Method Get
    Write-Host $status.Content -ForegroundColor Green
} catch {
    Write-Host "Status endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: A/B Test Results
Write-Host "`n=== Testing A/B Test Results ===" -ForegroundColor Green
try {
    $abtest = Invoke-WebRequest -Uri "http://localhost:5000/api/ml/abtest-results" -Method Get
    Write-Host $abtest.Content -ForegroundColor Green
} catch {
    Write-Host "A/B test endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n✅ API Testing Complete" -ForegroundColor Cyan
