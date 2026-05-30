import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import joblib
from datetime import datetime, timedelta
import os

class SalesPredictionModel:
    def __init__(self):
        self.model = LinearRegression()
        self.is_trained = False
        self.accuracy = 0.0
        self.features_used = ['month', 'week', 'day_of_week', 'day_of_month']
        
    def prepare_features(self, dates, sales_data=None):
        """
        Extract time-based features from dates
        """
        features = []
        for date in dates:
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            
            features.append([
                date.month,                    # Month (1-12)
                date.isocalendar()[1],        # Week of year (1-52)
                date.weekday(),                # Day of week (0=Monday, 6=Sunday)
                date.day                       # Day of month (1-31)
            ])
        
        return np.array(features)
    
    def train(self, historical_data):
        """
        Train the model on historical order data
        
        Args:
            historical_data: List of dicts with 'date' and 'totalAmount' keys
        """
        if len(historical_data) < 10:
            raise ValueError("Need at least 10 data points to train model")
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Group by date and sum sales
        daily_sales = df.groupby(df['date'].dt.date).agg({
            'totalAmount': ['sum', 'count']
        }).reset_index()
        daily_sales.columns = ['date', 'total_sales', 'order_count']
        daily_sales['date'] = pd.to_datetime(daily_sales['date'])
        
        # Prepare features and target
        X = self.prepare_features(daily_sales['date'].tolist())
        y = daily_sales['total_sales'].values
        
        # Split data for validation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Calculate accuracy
        y_pred = self.model.predict(X_test)
        self.accuracy = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        
        self.is_trained = True
        
        return {
            'accuracy': float(self.accuracy),
            'mae': float(mae),
            'training_samples': len(X_train),
            'test_samples': len(X_test)
        }
    
    def predict(self, days_ahead=30, start_date=None):
        """
        Predict sales for the next N days
        
        Args:
            days_ahead: Number of days to predict
            start_date: Starting date for predictions (default: tomorrow)
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        if start_date is None:
            start_date = datetime.now() + timedelta(days=1)
        elif isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        # Generate future dates
        future_dates = [start_date + timedelta(days=i) for i in range(days_ahead)]
        
        # Prepare features
        X_future = self.prepare_features(future_dates)
        
        # Make predictions
        predictions = self.model.predict(X_future)
        
        # Format results
        results = []
        for date, pred_sales in zip(future_dates, predictions):
            results.append({
                'date': date.strftime('%Y-%m-%d'),
                'predicted_sales': max(0, float(pred_sales)),  # Ensure non-negative
                'day_of_week': date.strftime('%A')
            })
        
        return results
    
    def save_model(self, filepath='trained_model.pkl'):
        """Save trained model to disk"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        model_data = {
            'model': self.model,
            'accuracy': self.accuracy,
            'features_used': self.features_used,
            'is_trained': self.is_trained
        }
        joblib.dump(model_data, filepath)
        return filepath
    
    def load_model(self, filepath='trained_model.pkl'):
        """Load trained model from disk"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        model_data = joblib.load(filepath)
        self.model = model_data['model']
        self.accuracy = model_data['accuracy']
        self.features_used = model_data['features_used']
        self.is_trained = model_data['is_trained']
        
        return True
