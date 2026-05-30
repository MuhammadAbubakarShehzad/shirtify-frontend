# Shirtify FYP — AI Features Grade Assessment
> Generated: April 2026 | Project: Shirtify Admin Dashboard (BSE FYP)

---

## Overall System Grade: A- | 8.5 / 10

```
┌──────────────────────────────────────────────────────────┐
│  Feature               │ Complexity │ Innovation │ Grade  │
├────────────────────────┼────────────┼────────────┼────────┤
│  Sales Prediction      │    8/10    │    8/10    │   A-   │
│  Demand Forecasting    │    7/10    │    7/10    │   B+   │
│  Recommendation Engine │    9/10    │    9/10    │    A   │
│  Overall System        │    8/10    │    8/10    │   A-   │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Sales Prediction (Facebook Prophet)
**Grade: A- | 8.5 / 10**
**File:** `backend/ml_service/app.py` → `run_prophet_forecast()`

### What makes it strong:
- Uses **Facebook Prophet** — an industry-grade time-series model used by Meta in production
- Configured with `seasonality_mode='multiplicative'` — correct choice for growth data
- Added a **custom Eid seasonality** (`model.add_seasonality(name="eid_season", ...)`) — Pakistan-specific domain knowledge, not a tutorial copy-paste
- Tuned `changepoint_prior_scale=0.05` — controls trend flexibility
- Returns **80% confidence intervals** (upper/lower bounds) — professional-grade output
- Computes real **MAPE + accuracy metrics** on fitted values

### What weakens it:
- Data is **synthetically generated** via `generate_sales_data()` — not pulled from real MongoDB orders
- `model.py` has a backup **Linear Regression** model which is much simpler and uses only date features (month, week, day)

### Viva Answer:
> "We use Facebook Prophet with multiplicative seasonality to capture Pakistan's apparel market patterns — specifically Eid spikes in April/May and winter demand in November/December. The model outputs 80% confidence intervals and we evaluate it using MAPE (Mean Absolute Percentage Error) to report accuracy."

---

## 2. Demand Forecasting (Distribution + Product Analysis)
**Grade: B+ | 7.5 / 10**
**File:** `backend/ml_service/app.py` → `get_distribution_analysis()`, `get_top_products()`, `get_product_table()`

### What makes it strong:
- Per-product, per-size aggregation on top of Prophet
- **Size distribution forecasting** (S/M/L/XL demand split) — real inventory management value
- Trend calculation: compares **recent 3 months vs earlier periods** to compute `+18%` / `-5%` product trends
- Full product performance table with revenue breakdown

### What weakens it:
- More **analytics** than true independent forecasting — it projects existing patterns forward rather than learning new demand signals
- Relies on same synthetic data as sales prediction

### Viva Answer:
> "The demand forecasting module goes beyond aggregate revenue — it identifies SKU-level demand patterns, showing which sizes and categories will peak. This enables proactive inventory stocking rather than reactive restocking, reducing both stockouts and overstock."

---

## 3. Recommendation Engine (Hybrid: Content-Based + Collaborative)
**Grade: A | 9 / 10** ← STRONGEST FEATURE
**Files:**
- Content-Based: `backend/ml_service/recommend.py`
- Collaborative Filter: `backend/services/collaborativeFilter.js`
- Hybrid Merger: `backend/routes/recommendationRoutes.js` → `/api/recommendations/hybrid`

### What makes it strong:
- **True Hybrid Engine** — not just one algorithm but two combined with configurable weights
- **Content-Based (Python):**
  - Manual feature engineering across 6 dimensions: category, style, fabric, fit, sleeve length, price, tags
  - One-hot encoding built from scratch (no sklearn Pipeline shortcut)
  - Cosine Similarity between user preference vector and catalog
  - User preference vector = mean of all viewed product vectors
  - Handles **cold-start problem** (returns popular items if no history)
- **Collaborative Filter (Node.js / TensorFlow.js):**
  - Neural network with **user and product embedding layers** (matrix factorization)
  - Embedding size 32, Adam optimizer, MSE loss
  - Trains on real `UserInteraction` MongoDB data
  - Scheduled retraining via cron job
- **Hybrid Merger:**
  - Blends content + collab scores with `weights: { content: 0.5, collab: 0.5 }`
  - Weights are **configurable at runtime** — can tune content vs collab balance
  - Handles collab-only items that don't appear in content list
  - Returns `scores: { total, content, collab }` for each recommendation — transparent AI

### What weakens it:
- The TF.js collaborative model has **never been trained** (no real interaction data exists yet) — the collab half is architecturally complete but untested
- Lines 60-63 in `recommendationRoutes.js` have an unfinished block for resolving collab-only item details

### Viva Answer:
> "We implemented a hybrid recommendation system combining content-based filtering — using multi-dimensional cosine similarity across category, style, fabric, fit, sleeve, and tag features — with collaborative filtering via neural network embeddings built in TensorFlow.js, using matrix factorization. The system blends both scores with configurable weights, a pattern used by Netflix and Amazon. We also handle the cold-start problem by serving popular items to new users."

---

## Critical Viva Questions — Be Ready For These

### Q: "Where does your prediction data come from?"
**A:** "Currently the system uses a realistic synthetic data generator that simulates Pakistani t-shirt sales patterns — trends, seasonal spikes, and size distributions. The architecture is designed so that `generate_sales_data()` is replaced by a MongoDB aggregation query when the live storefront is connected. The training script `train.py` already implements this MongoDB fetch."

### Q: "Has your collaborative filter actually been trained?"
**A:** "The collaborative filter requires user interaction data — views, cart additions, purchases — from the live storefront. The tracking endpoint (`/api/recommendations/track`) is implemented and ready to collect this data. The model will be trained once the storefront goes live and interaction data accumulates. The content-based engine is fully functional in the meantime."

### Q: "Why did you choose Prophet over LSTM or ARIMA?"
**A:** "Prophet was chosen because it handles missing data gracefully, automatically detects seasonality, and allows us to add domain-specific seasonality like Eid — which ARIMA cannot do without manual decomposition. LSTM would require more data (thousands of data points) and is harder to interpret. Prophet gives interpretable components: trend + yearly seasonality + custom seasons."

### Q: "How is your recommendation engine better than simple filtering?"
**A:** "Simple category filtering shows all shirts in a category. Our engine builds a user preference vector from their interaction history and finds mathematically similar products using cosine similarity — so if a user liked Graphic tees and Streetwear, we recommend products high in both categories, not just one. The collaborative layer adds social proof — it learns that users similar to this person also liked these products."

---

## Technology Stack Summary

| Component | Technology | Industry Equivalent |
|-----------|-----------|-------------------|
| Sales Forecasting | Facebook Prophet (Python) | Used by Meta, Walmart |
| Demand Analysis | Pandas + NumPy aggregations | Standard data science |
| Content-Based Filtering | Cosine Similarity (scikit-learn) | Used by Spotify |
| Collaborative Filtering | TensorFlow.js Neural Embeddings | Used by Netflix, Amazon |
| ML Service | Flask REST API | Microservice architecture |
| Scheduled Retraining | node-cron | Production ML pipelines |
| Interaction Tracking | MongoDB UserInteraction model | Production recommendation systems |

---

## Files Reference

```
backend/ml_service/
  app.py          ← Flask API + Prophet pipeline (MAIN)
  model.py        ← Linear Regression backup model
  recommend.py    ← Content-based recommendation engine
  train.py        ← MongoDB-connected training script
  requirements.txt

backend/services/
  collaborativeFilter.js  ← TF.js collaborative filter

backend/routes/
  mlRoutes.js              ← Prophet API endpoints
  recommendationRoutes.js  ← Hybrid recommendation API

backend/models/
  UserInteraction.js  ← Tracks user behaviour for collab filter

backend/jobs/
  retrainJob.js  ← Scheduled nightly model retraining (cron)
```
