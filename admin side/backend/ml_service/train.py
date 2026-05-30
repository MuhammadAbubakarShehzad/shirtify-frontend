"""
Training script for ML sales prediction model
Fetches historical order data from MongoDB and trains the model
"""

from pymongo import MongoClient
from model import SalesPredictionModel
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def fetch_historical_orders():
    """Fetch historical orders from MongoDB"""
    try:
        # Connect to MongoDB
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/shirtify')
        client = MongoClient(mongo_uri)
        db = client.get_database()
        
        # Fetch orders from the last 6 months
        six_months_ago = datetime.now() - timedelta(days=180)
        
        orders = db.orders.find({
            'createdAt': {'$gte': six_months_ago},
            'status': {'$in': ['pending', 'confirmed', 'shipped', 'delivered']}
        }).sort('createdAt', 1)
        
        # Extract date and totalAmount
        historical_data = []
        for order in orders:
            total = order.get('totalAmount') or order.get('totalPrice') or 0
            
            historical_data.append({
                'date': order['createdAt'].isoformat(),
                'totalAmount': float(total)
            })
        
        client.close()
        
        print(f"[OK] Fetched {len(historical_data)} orders from database")
        return historical_data
    
    except Exception as e:
        print(f"[ERROR] Error fetching orders: {e}")
        return None

def train_model():
    """Train the ML model on historical data"""
    print("... Starting model training ...")
    
    # Fetch data
    historical_data = fetch_historical_orders()
    
    if not historical_data:
        print("[ERROR] No historical data available. Cannot train model.")
        return False
    
    if len(historical_data) < 10:
        print(f"[WARN] Only {len(historical_data)} orders found. Need at least 10 for training.")
        print("TIP: Consider seeding more order data using backend/seed_orders.js")
        return False
    
    # Initialize and train model
    model = SalesPredictionModel()
    
    try:
        results = model.train(historical_data)
        
        print(f"\n[OK] Model trained successfully!")
        print(f"Accuracy (R2 score): {results['accuracy']:.2%}")
        print(f"Mean Absolute Error: Rs {results['mae']:.2f}")
        print(f"Training samples: {results['training_samples']}")
        print(f"Test samples: {results['test_samples']}")
        
        # Save model
        model_path = os.path.join(os.path.dirname(__file__), 'trained_model.pkl')
        model.save_model(model_path)
        print(f"\n[SAVE] Model saved to: {model_path}")
        
        # Test prediction
        print("\n[PREDICTION] Testing predictions for next 7 days:")
        predictions = model.predict(days_ahead=7)
        for pred in predictions[:7]:
            print(f"  {pred['date']} ({pred['day_of_week']}): Rs {pred['predicted_sales']:.2f}")
        
        return True
    
    except Exception as e:
        print(f"[ERROR] Training failed: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("  ML Sales Prediction Model - Training Script")
    print("=" * 60)
    print()
    
    success = train_model()
    
    print()
    print("=" * 60)
    if success:
        print("[OK] Training completed successfully!")
        print("... Run 'python app.py' to start the prediction service ...")
    else:
        print("[ERROR] Training failed. Please check the errors above.")
    print("=" * 60)
