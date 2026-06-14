"""
Shirtify AI Sales Prediction + Recommendation Backend
Flask + Facebook Prophet ML Pipeline + Cosine Similarity Recommendation
FYP - Balaj Mir | CUST BSE223053
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta
import json
import warnings
import os
warnings.filterwarnings("ignore")

# Import Recommendation Engine
from recommend import get_recommendations, get_similar_products, get_catalog, reload_catalog

app = Flask(__name__)
CORS(app)  # Allow frontend to call this API

# ─────────────────────────────────────────────
#  SEED DATA GENERATOR
#  Simulates realistic T-shirt sales data.
#  Replace generate_sales_data() with your
#  MongoDB fetch when real data is available.
# ─────────────────────────────────────────────

PRODUCTS = [
    {"name": "Casual Round Neck",    "category": "Casual",   "base": 420},
    {"name": "Polo Classic",         "category": "Formal",   "base": 310},
    {"name": "Graphic Street Tee",   "category": "Graphic",  "base": 280},
    {"name": "Slim Fit V-Neck",      "category": "Formal",   "base": 260},
    {"name": "Oversized Drop Tee",   "category": "Streetwear","base": 230},
    {"name": "Basic White Tee",      "category": "Casual",   "base": 210},
    {"name": "Henley Long Sleeve",   "category": "Casual",   "base": 185},
    {"name": "Printed Logo Tee",     "category": "Graphic",  "base": 170},
]

SIZES   = ["S", "M", "L", "XL"]
COLORS  = ["Black", "White", "Navy", "Grey", "Olive"]
SIZE_SPLIT  = {"S": 0.20, "M": 0.35, "L": 0.30, "XL": 0.15}
PRICE_PKR   = 2500  # avg price per unit


def generate_sales_data(months: int = 12) -> pd.DataFrame:
    """
    Generate realistic monthly sales data with:
    - Upward growth trend
    - Seasonal spikes (Eid, back-to-school, winter)
    - Random noise
    """
    np.random.seed(42)
    end   = datetime.now().replace(day=1)
    start = end - timedelta(days=30 * months)
    date_range = pd.date_range(start=start, periods=months, freq="MS")

    records = []
    for i, date in enumerate(date_range):
        month = date.month

        # Seasonal multiplier (Eid ~April/May, Winter Nov-Dec, Summer Jun-Jul)
        seasonal = {1:0.85, 2:0.90, 3:1.05, 4:1.25, 5:1.20,
                    6:1.10, 7:1.05, 8:0.95, 9:0.90, 10:1.00,
                    11:1.15, 12:1.30}.get(month, 1.0)

        growth = 1 + (i * 0.018)  # 1.8% monthly growth

        for product in PRODUCTS:
            for size in SIZES:
                units = int(
                    product["base"]
                    * SIZE_SPLIT[size]
                    * seasonal
                    * growth
                    * (0.85 + np.random.rand() * 0.30)
                )
                units = max(units, 5)
                records.append({
                    "ds":       date,
                    "product":  product["name"],
                    "category": product["category"],
                    "size":     size,
                    "color":    np.random.choice(COLORS),
                    "units":    units,
                    "revenue":  units * PRICE_PKR,
                })

    return pd.DataFrame(records)


def load_professional_data(months: int = 12) -> pd.DataFrame:
    """
    Load high-quality research data from CSV (Research/Kaggle Mode)
    """
    csv_path = os.path.join(os.path.dirname(__file__), "professional_data.csv")
    if not os.path.exists(csv_path):
        return generate_sales_data(months)
    
    df = pd.read_csv(csv_path)
    df['ds'] = pd.to_datetime(df['ds'])
    
    # Filter by timeframe
    end_date = df['ds'].max()
    start_date = end_date - timedelta(days=30 * months)
    df = df[df['ds'] > start_date]
    
    return df


def get_data_from_source(source="mock", period=6):
    """Helper to select data source"""
    if source == "kaggle":
        return load_professional_data(months=period)
    return generate_sales_data(months=period)


# ─────────────────────────────────────────────
#  PROPHET ML PIPELINE
# ─────────────────────────────────────────────

def run_prophet_forecast(df: pd.DataFrame, forecast_months: int = 4) -> dict:
    """
    Train Facebook Prophet on monthly aggregated sales,
    return historical + forecast with confidence intervals.
    """
    # Aggregate to monthly totals
    monthly = df.groupby("ds")["units"].sum().reset_index()
    monthly.columns = ["ds", "y"]
    monthly = monthly.sort_values("ds")

    # ── Prophet model with Pakistani market seasonality ──
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="multiplicative",   # better for growth data
        interval_width=0.80,                 # 80% confidence interval
        changepoint_prior_scale=0.05,        # controls trend flexibility
    )

    # Add custom Eid seasonality (approx April-May spike)
    model.add_seasonality(
        name="eid_season",
        period=365.25,
        fourier_order=3,
    )

    model.fit(monthly)

    # Build future dataframe
    future = model.make_future_dataframe(periods=forecast_months, freq="MS")
    forecast = model.predict(future)

    # ── Build response arrays ──
    hist_len = len(monthly)

    historical_dates  = monthly["ds"].dt.strftime("%b %Y").tolist()
    historical_units  = monthly["y"].tolist()

    future_rows = forecast.iloc[hist_len:]
    forecast_dates = future_rows["ds"].dt.strftime("%b %Y").tolist()
    forecast_pred  = future_rows["yhat"].clip(lower=0).round().astype(int).tolist()
    forecast_upper = future_rows["yhat_upper"].clip(lower=0).round().astype(int).tolist()
    forecast_lower = future_rows["yhat_lower"].clip(lower=0).round().astype(int).tolist()

    # ── KPIs ──
    total_predicted = sum(forecast_pred)
    avg_units_month = round(monthly["y"].mean())
    growth_pct      = round(((historical_units[-1] - historical_units[0]) / historical_units[0]) * 100, 1)

    # MAPE on fitted values
    fitted = forecast.iloc[:hist_len]["yhat"].clip(lower=0).values
    actual = monthly["y"].values
    mape   = round(float(np.mean(np.abs((actual - fitted) / (actual + 1e-6))) * 100), 2)
    accuracy = round(100 - mape, 2)

    return {
        "historical": {
            "dates": historical_dates,
            "units": historical_units,
        },
        "forecast": {
            "dates": forecast_dates,
            "pred":  forecast_pred,
            "upper": forecast_upper,
            "lower": forecast_lower,
        },
        "kpis": {
            "total_predicted_units": total_predicted,
            "expected_revenue_pkr":  total_predicted * PRICE_PKR,
            "model_accuracy_pct":    accuracy,
            "mape_pct":              mape,
            "avg_units_month":       avg_units_month,
            "growth_pct":            growth_pct,
            "forecast_months":       forecast_months,
            "model":                 "Facebook Prophet",
            "seasonality_mode":      "Multiplicative",
            "confidence_interval":   "80%",
        }
    }


def get_distribution_analysis(df: pd.DataFrame) -> dict:
    """
    Category and size distribution for pie/bar charts.
    """
    cat_sales  = df.groupby("category")["units"].sum().to_dict()
    size_sales = df.groupby("size")["units"].sum().to_dict()
    size_sales = {s: size_sales.get(s, 0) for s in ["S", "M", "L", "XL"]}
    return {"by_category": cat_sales, "by_size": size_sales}


def get_top_products(df: pd.DataFrame, n: int = 3) -> list:
    """
    Top N products by total units sold.
    """
    product_totals = (
        df.groupby(["product", "category"])
        .agg(units=("units", "sum"), revenue=("revenue", "sum"))
        .reset_index()
        .sort_values("units", ascending=False)
        .head(n)
    )

    results = []
    for _, row in product_totals.iterrows():
        # Calculate trend (last 3 months vs earlier)
        prod_df   = df[df["product"] == row["product"]].groupby("ds")["units"].sum().reset_index()
        if len(prod_df) >= 4:
            recent  = prod_df["units"].iloc[-3:].mean()
            earlier = prod_df["units"].iloc[:-3].mean()
            trend   = round(((recent - earlier) / (earlier + 1e-6)) * 100, 1)
            trend_str = f"+{trend}%" if trend >= 0 else f"{trend}%"
        else:
            trend_str = "+0.0%"

        results.append({
            "name":     row["product"],
            "category": row["category"],
            "size":     "M",
            "color":    "Black",
            "units":    int(row["units"]),
            "revenue":  int(row["revenue"]),
            "trend":    trend_str,
        })

    return results


def get_product_table(df: pd.DataFrame) -> list:
    """
    Full product breakdown for the table.
    """
    product_totals = (
        df.groupby(["product", "category", "size"])
        .agg(units=("units", "sum"), revenue=("revenue", "sum"))
        .reset_index()
        .sort_values("units", ascending=False)
    )

    rows = []
    for _, row in product_totals.iterrows():
        prod_df = df[
            (df["product"] == row["product"]) & (df["size"] == row["size"])
        ].groupby("ds")["units"].sum().reset_index()

        if len(prod_df) >= 4:
            recent  = prod_df["units"].iloc[-3:].mean()
            earlier = prod_df["units"].iloc[:-3].mean()
            trend   = round(((recent - earlier) / (earlier + 1e-6)) * 100, 1)
            trend_str = f"+{trend}%" if trend >= 0 else f"{trend}%"
        else:
            trend_str = "+0.0%"

        rows.append({
            "name":     row["product"],
            "category": row["category"],
            "size":     row["size"],
            "color":    "Mixed",
            "units":    int(row["units"]),
            "revenue":  int(row["revenue"]),
            "trend":    trend_str,
        })

    return rows


# ─────────────────────────────────────────────
#  API ROUTES
# ─────────────────────────────────────────────

@app.route("/api/forecast", methods=["GET"])
def api_forecast():
    """
    Main Prophet forecast endpoint.
    Query params:
      - period: 3 | 6 | 12  (months of history to use)
      - horizon: 1–6        (months ahead to forecast)
    """
    try:
        period  = int(request.args.get("period",  6))
        horizon = int(request.args.get("horizon", 4))

        period  = max(3, min(period,  36)) # Increased max for research mode
        horizon = max(1, min(horizon,  6))
        source  = request.args.get("source", "mock")

        df = get_data_from_source(source=source, period=period)
        result = run_prophet_forecast(df, forecast_months=horizon)
        
        # Add source info to result
        result["kpis"]["data_source"] = "Kaggle (Research Mode)" if source == "kaggle" else "Live Store (Mock)"

        return jsonify({"success": True, "data": result})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/distribution", methods=["GET"])
def api_distribution():
    """
    Category and size distribution for charts.
    """
    try:
        period = int(request.args.get("period", 6))
        source = request.args.get("source", "mock")
        df     = get_data_from_source(source=source, period=period)
        result = get_distribution_analysis(df)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/products", methods=["GET"])
def api_products():
    """
    Top performers + full product table.
    """
    try:
        period = int(request.args.get("period", 6))
        source = request.args.get("source", "mock")
        df     = get_data_from_source(source=source, period=period)

        return jsonify({
            "success": True,
            "data": {
                "top_products":  get_top_products(df, n=3),
                "product_table": get_product_table(df),
                "dataset_info": {
                    "period_months":  period,
                    "total_records":  f"{period} months",
                    "best_seller":    get_top_products(df, n=1)[0]["name"],
                    "avg_units":      round(df.groupby("ds")["units"].sum().mean()),
                    "growth_trend":   f"+{round(((df.groupby('ds')['units'].sum().iloc[-1] - df.groupby('ds')['units'].sum().iloc[0]) / df.groupby('ds')['units'].sum().iloc[0]) * 100, 1)}%"
                }
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────
#  RECOMMENDATION API ROUTES
# ─────────────────────────────────────────────

@app.route("/api/recommendations", methods=["POST"])
def api_recommendations():
    """
    Get AI-powered product recommendations for a user.
    Body JSON:
      - viewed_ids: list of product IDs the user has viewed/bought
      - top_n: number of recommendations to return (default 4)
    """
    try:
        data = request.get_json() or {}
        viewed_ids = data.get("viewed_ids", [])
        top_n = int(data.get("top_n", 4))

        result = get_recommendations(viewed_ids, top_n=top_n)
        return jsonify({"success": True, "data": result})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/similar/<product_id>", methods=["GET"])
def api_similar(product_id):
    """
    Get products similar to a given product.
    Used for 'You May Also Like' sections.
    Query params:
      - top_n: number of similar products to return (default 4)
    """
    try:
        top_n = int(request.args.get("top_n", 4))
        result = get_similar_products(product_id, top_n=top_n)

        if "error" in result:
            return jsonify({"success": False, "error": result["error"]}), 404

        return jsonify({"success": True, "data": result})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/catalog", methods=["GET"])
def api_catalog():
    """
    Return the full product catalog for dropdowns / testing.
    """
    try:
        catalog = get_catalog()
        return jsonify({"success": True, "data": catalog})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/reload-catalog", methods=["POST"])
def api_reload_catalog():
    """
    Hot-reload the product catalog from MongoDB without restarting Flask.
    Call this after connecting the admin dashboard to the real storefront DB.
    """
    try:
        count = reload_catalog()
        return jsonify({"success": True, "message": f"Catalog reloaded: {count} products", "count": count})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "Facebook Prophet", "version": "1.0.0"})


if __name__ == "__main__":
    print("Shirtify ML Backend starting on http://localhost:5050")
    print("Model: Facebook Prophet | Framework: Flask")
    app.run(debug=False, port=5050)
