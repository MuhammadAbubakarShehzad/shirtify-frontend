# ML Sales Prediction Service

This directory contains the Python-based ML microservice for sales forecasting.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend/ml_service
   pip install -r requirements.txt
   ```

2. **Train the model:**
   ```bash
   python train.py
   ```
   This will fetch historical orders from MongoDB and train the model.

3. **Start the ML service:**
   ```bash
   python app.py
   ```
   The service will run on port 5001.

## API Endpoints

### Health Check
```
GET http://localhost:5001/health
```

### Train Model
```
POST http://localhost:5001/train
Body: {
  "historical_data": [
    {"date": "2024-01-01", "totalAmount": 5000},
    ...
  ]
}
```

### Predict Sales
```
POST http://localhost:5001/predict
Body: {
  "days_ahead": 30,
  "start_date": "2024-03-01" (optional)
}
```

### Model Info
```
GET http://localhost:5001/model-info
```

## Integration with Node.js

The Node.js backend provides a wrapper API at `/api/ml/*` that communicates with this Python service.

## Files

- `model.py` - ML model class (LinearRegression)
- `app.py` - Flask API server
- `train.py` - Training script
- `requirements.txt` - Python dependencies
- `trained_model.pkl` - Saved model (generated after training)
