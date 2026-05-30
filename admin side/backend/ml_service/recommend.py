"""
Shirtify AI Recommendation Engine
Content-Based Filtering using Cosine Similarity
FYP - Balaj Mir | CUST BSE223053

Supports dynamic catalog loading from MongoDB.
Falls back to hardcoded catalog if MongoDB is unavailable.
"""

import os
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict

# Load .env so MONGODB_URI is available when running standalone
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
except ImportError:
    pass


# ─────────────────────────────────────────────
#  FALLBACK HARDCODED CATALOG
#  Used when MongoDB is unavailable (demo / offline mode).
# ─────────────────────────────────────────────

_FALLBACK_CATALOG = [
    {"id": "p001", "name": "Casual Round Neck",     "category": "Casual",     "style": "Round Neck",    "fabric": "Cotton",            "fit": "Regular",  "sleeve": "Half Sleeve", "price": 2500, "tags": ["everyday", "comfort", "basic"],          "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"},
    {"id": "p002", "name": "Polo Classic",           "category": "Formal",     "style": "Polo",          "fabric": "Pique Cotton",       "fit": "Regular",  "sleeve": "Half Sleeve", "price": 3200, "tags": ["office", "smart", "collar"],             "image": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400"},
    {"id": "p003", "name": "Graphic Street Tee",     "category": "Graphic",    "style": "Round Neck",    "fabric": "Cotton Blend",       "fit": "Relaxed",  "sleeve": "Half Sleeve", "price": 2800, "tags": ["artistic", "trendy", "print"],           "image": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400"},
    {"id": "p004", "name": "Slim Fit V-Neck",        "category": "Formal",     "style": "V-Neck",        "fabric": "Cotton Lycra",       "fit": "Slim",     "sleeve": "Half Sleeve", "price": 2700, "tags": ["fitted", "smart", "modern"],             "image": "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400"},
    {"id": "p005", "name": "Oversized Drop Tee",     "category": "Streetwear", "style": "Drop Shoulder", "fabric": "Heavy Cotton",       "fit": "Oversized","sleeve": "Half Sleeve", "price": 3000, "tags": ["streetwear", "trendy", "loose"],         "image": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400"},
    {"id": "p006", "name": "Basic White Tee",        "category": "Casual",     "style": "Round Neck",    "fabric": "Cotton",            "fit": "Regular",  "sleeve": "Half Sleeve", "price": 1800, "tags": ["basic", "everyday", "wardrobe-essential"],"image": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400"},
    {"id": "p007", "name": "Henley Long Sleeve",     "category": "Casual",     "style": "Henley",        "fabric": "Cotton",            "fit": "Regular",  "sleeve": "Full Sleeve", "price": 2900, "tags": ["layering", "winter", "comfort"],          "image": "https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=400"},
    {"id": "p008", "name": "Printed Logo Tee",       "category": "Graphic",    "style": "Round Neck",    "fabric": "Cotton Blend",       "fit": "Regular",  "sleeve": "Half Sleeve", "price": 2200, "tags": ["logo", "print", "trendy"],               "image": "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400"},
    {"id": "p009", "name": "Premium Minimalist Tee", "category": "Premium",    "style": "Round Neck",    "fabric": "Supima Cotton",      "fit": "Slim",     "sleeve": "Half Sleeve", "price": 4500, "tags": ["luxury", "minimal", "clean"],            "image": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400"},
    {"id": "p010", "name": "Athletic Performance",   "category": "Sports",     "style": "Round Neck",    "fabric": "Dri-Fit Polyester",  "fit": "Slim",     "sleeve": "Half Sleeve", "price": 3500, "tags": ["gym", "sports", "activewear"],           "image": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"},
    {"id": "p011", "name": "Vintage Wash Tee",       "category": "Streetwear", "style": "Round Neck",    "fabric": "Acid Wash Cotton",   "fit": "Relaxed",  "sleeve": "Half Sleeve", "price": 3200, "tags": ["vintage", "retro", "streetwear"],        "image": "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400"},
    {"id": "p012", "name": "Formal Dress Shirt Tee", "category": "Formal",     "style": "Mock Neck",     "fabric": "Cotton Lycra",       "fit": "Slim",     "sleeve": "Full Sleeve", "price": 3800, "tags": ["formal", "office", "meeting"],           "image": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400"},
]


# ─────────────────────────────────────────────
#  FEATURE CONSTANTS (fixed vocabulary)
# ─────────────────────────────────────────────

ALL_CATEGORIES = ["Casual", "Formal", "Sports", "Graphic", "Premium", "Minimalist", "Streetwear"]
ALL_STYLES     = ["Round Neck", "V-Neck", "Polo", "Henley", "Drop Shoulder", "Mock Neck"]
ALL_FABRICS    = ["Cotton", "Pique Cotton", "Cotton Blend", "Cotton Lycra",
                  "Heavy Cotton", "Supima Cotton", "Dri-Fit Polyester", "Acid Wash Cotton"]
ALL_FITS       = ["Regular", "Slim", "Relaxed", "Oversized"]
ALL_SLEEVES    = ["Half Sleeve", "Full Sleeve"]


# ─────────────────────────────────────────────
#  ENGINE STATE (mutable — rebuilt via initialize_engine)
# ─────────────────────────────────────────────

CATALOG        = []
FEATURE_MATRIX = None
ALL_TAGS       = []


# ─────────────────────────────────────────────
#  MONGODB CATALOG LOADER
# ─────────────────────────────────────────────

_STYLE_MAP = {
    "Formal":     "Polo",
    "Casual":     "Round Neck",
    "Sports":     "Round Neck",
    "Graphic":    "Round Neck",
    "Streetwear": "Drop Shoulder",
    "Premium":    "Round Neck",
    "Minimalist": "Round Neck",
}

_TAG_MAP = {
    "Formal":     ["office", "smart", "collar"],
    "Casual":     ["everyday", "comfort", "basic"],
    "Sports":     ["gym", "sports", "activewear"],
    "Graphic":    ["artistic", "trendy", "print"],
    "Streetwear": ["streetwear", "trendy", "loose"],
    "Premium":    ["luxury", "minimal", "clean"],
    "Minimalist": ["minimal", "clean", "basic"],
}


def load_catalog_from_mongodb() -> list:
    """
    Fetch products from MongoDB and convert to recommendation feature format.
    Uses real _id values so collaborative + content scores can be merged correctly.
    Returns None if MongoDB is unavailable.
    """
    try:
        from pymongo import MongoClient

        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/shirtify")
        client = MongoClient(uri, serverSelectionTimeoutMS=3000)

        # Determine database name from URI or default
        db_name = uri.split("/")[-1].split("?")[0] or "shirtify"
        db = client[db_name]

        products = list(db.products.find(
            {},
            {"_id": 1, "name": 1, "category": 1, "price": 1, "image": 1}
        ))
        client.close()

        if not products:
            print("[Recommend] MongoDB connected but no products found — using fallback catalog.")
            return None

        catalog = []
        for p in products:
            category = p.get("category", "Casual")
            catalog.append({
                "id":       str(p["_id"]),
                "name":     p.get("name", "Product"),
                "category": category,
                "style":    _STYLE_MAP.get(category, "Round Neck"),
                "fabric":   "Cotton",        # sensible default
                "fit":      "Regular",       # sensible default
                "sleeve":   "Half Sleeve",   # sensible default
                "price":    p.get("price", 2500),
                "tags":     _TAG_MAP.get(category, ["basic"]),
                "image":    p.get("image", ""),
            })

        print(f"[Recommend] OK Loaded {len(catalog)} products from MongoDB (real IDs active)")
        return catalog

    except Exception as e:
        print(f"[Recommend] WARN MongoDB unavailable ({e}) — using hardcoded fallback catalog")
        return None


# ─────────────────────────────────────────────
#  FEATURE ENGINEERING
# ─────────────────────────────────────────────

def _build_feature_vector(product: dict) -> np.ndarray:
    """
    Convert a single product into a fixed-length numerical feature vector.
    One-hot encodes category / style / fabric / fit / sleeve,
    adds tag presence flags, and appends normalized price.
    """
    vec = []

    vec += [1 if product.get("category") == c else 0 for c in ALL_CATEGORIES]
    vec += [1 if product.get("style")    == s else 0 for s in ALL_STYLES]
    vec += [1 if product.get("fabric")   == f else 0 for f in ALL_FABRICS]
    vec += [1 if product.get("fit")      == f else 0 for f in ALL_FITS]
    vec += [1 if product.get("sleeve")   == s else 0 for s in ALL_SLEEVES]
    vec += [1 if tag in product.get("tags", []) else 0 for tag in ALL_TAGS]

    prices  = [p.get("price", 2500) for p in CATALOG]
    min_p   = min(prices) if prices else 0
    max_p   = max(prices) if prices else 5000
    norm_p  = (product.get("price", 2500) - min_p) / (max_p - min_p + 1e-6)
    vec.append(norm_p)

    return np.array(vec, dtype=np.float64)


# ─────────────────────────────────────────────
#  ENGINE INITIALIZER
# ─────────────────────────────────────────────

def initialize_engine() -> int:
    """
    (Re)build the recommendation engine:
      1. Try loading catalog from MongoDB.
      2. Fall back to hardcoded catalog if MongoDB is unavailable.
      3. Rebuild ALL_TAGS and FEATURE_MATRIX from the active catalog.
    Returns the number of products in the active catalog.
    """
    global CATALOG, FEATURE_MATRIX, ALL_TAGS

    db_catalog = load_catalog_from_mongodb()
    CATALOG    = db_catalog if db_catalog else _FALLBACK_CATALOG

    # Rebuild tag vocabulary from current catalog
    ALL_TAGS = sorted(set(tag for p in CATALOG for tag in p.get("tags", [])))

    # Rebuild feature matrix
    FEATURE_MATRIX = np.array([_build_feature_vector(p) for p in CATALOG])

    print(f"[Recommend] Engine ready — {len(CATALOG)} products, "
          f"{len(ALL_TAGS)} unique tags, feature dim = {FEATURE_MATRIX.shape[1]}")

    return len(CATALOG)


# Initialise on import (Flask startup)
initialize_engine()


# ─────────────────────────────────────────────
#  RECOMMENDATION ENGINE FUNCTIONS
# ─────────────────────────────────────────────

def get_recommendations(
    viewed_product_ids: List[str],
    top_n: int = 4,
    exclude_viewed: bool = True,
) -> Dict:
    """
    Given a list of product IDs the user has viewed / purchased,
    return the top-N most similar products using cosine similarity.

    Algorithm:
      1. Build a user preference vector = mean of viewed product feature vectors.
      2. Compute cosine similarity between user vector and every catalog product.
      3. Rank by score; exclude already-viewed products.
    """
    viewed_products = [p for p in CATALOG if p["id"] in viewed_product_ids]

    # Cold-start: no history → return popular items
    if not viewed_products:
        return {
            "recommendations": CATALOG[:top_n],
            "scores":          [0.0] * min(top_n, len(CATALOG)),
            "algorithm":       "cold_start_popular",
            "message":         "No viewing history — showing popular items.",
        }

    # Build user preference vector (mean of viewed items)
    viewed_indices = [i for i, p in enumerate(CATALOG) if p["id"] in viewed_product_ids]
    user_vector    = FEATURE_MATRIX[viewed_indices].mean(axis=0).reshape(1, -1)

    # Cosine similarity against full catalog
    similarities    = cosine_similarity(user_vector, FEATURE_MATRIX)[0]
    ranked_indices  = np.argsort(similarities)[::-1]

    recommendations = []
    scores          = []
    for idx in ranked_indices:
        product = CATALOG[idx]
        if exclude_viewed and product["id"] in viewed_product_ids:
            continue
        recommendations.append(product)
        scores.append(round(float(similarities[idx]) * 100, 1))
        if len(recommendations) >= top_n:
            break

    viewed_categories = list(set(p["category"] for p in viewed_products))
    viewed_tags       = list(set(tag for p in viewed_products for tag in p.get("tags", [])))

    return {
        "recommendations": recommendations,
        "scores":          scores,
        "algorithm":       "content_based_cosine_similarity",
        "model_info": {
            "method":            "Cosine Similarity",
            "features_used":     int(FEATURE_MATRIX.shape[1]),
            "catalog_size":      len(CATALOG),
            "user_history_size": len(viewed_products),
        },
        "user_profile": {
            "preferred_categories": viewed_categories,
            "preferred_tags":       viewed_tags[:8],
            "products_viewed":      [p["name"] for p in viewed_products],
        },
    }


def get_similar_products(product_id: str, top_n: int = 4) -> Dict:
    """
    Given a single product_id, find the N most similar products.
    Used for 'You may also like' on product detail pages.
    """
    idx = next((i for i, p in enumerate(CATALOG) if p["id"] == product_id), None)
    if idx is None:
        return {"error": f"Product {product_id} not found in catalog", "recommendations": []}

    product_vector = FEATURE_MATRIX[idx].reshape(1, -1)
    similarities   = cosine_similarity(product_vector, FEATURE_MATRIX)[0]
    ranked_indices = np.argsort(similarities)[::-1]

    results = []
    scores  = []
    for i in ranked_indices:
        if i == idx:
            continue
        results.append(CATALOG[i])
        scores.append(round(float(similarities[i]) * 100, 1))
        if len(results) >= top_n:
            break

    return {
        "source_product":  CATALOG[idx],
        "recommendations": results,
        "scores":          scores,
        "algorithm":       "item_item_cosine_similarity",
    }


def get_catalog() -> List[Dict]:
    """Return the full active product catalog."""
    return CATALOG


def reload_catalog() -> int:
    """Re-fetch catalog from MongoDB and rebuild the feature matrix. Returns new catalog size."""
    return initialize_engine()


# ─────────────────────────────────────────────
#  STANDALONE TEST
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  Shirtify Recommendation Engine — Self Test")
    print(f"  Catalog source: {'MongoDB' if any(len(p['id']) > 5 for p in CATALOG) else 'Fallback'}")
    print("=" * 60)

    test_views = [CATALOG[2]["id"], CATALOG[7]["id"]]
    print(f"\n📋 User viewed: {[p['name'] for p in CATALOG if p['id'] in test_views]}")

    result = get_recommendations(test_views, top_n=4)
    print(f"🤖 Algorithm: {result['algorithm']}")
    print(f"📊 Features used: {result['model_info']['features_used']}")
    print(f"\n🎯 Recommendations:")
    for product, score in zip(result["recommendations"], result["scores"]):
        print(f"   {score}% match → {product['name']} ({product['category']})")

    print(f"\n👤 User Profile:")
    print(f"   Preferred categories: {result['user_profile']['preferred_categories']}")
    print(f"   Preferred tags: {result['user_profile']['preferred_tags']}")
