const express = require('express');
const router = express.Router();
const axios = require('axios');
const collabFilter = require('../services/collaborativeFilter');
const UserInteraction = require('../models/UserInteraction');
const Product = require('../models/Product');

// The Python ML Service address
const ML_API = 'http://localhost:5050';

/**
 * @route   POST /api/recommendations/hybrid
 * @desc    Get Hybrid Recommendations (Combines Content & Collab scores)
 * @access  Public
 */
router.post('/hybrid', async (req, res) => {
    try {
        const { userId, viewed_ids = [], weights = { content: 0.5, collab: 0.5 }, top_n = 4 } = req.body;
        
        let contentRecs = [];
        let collabRecs = [];
        const combinedScores = {}; // productId -> score summary

        // 1. Get Content-Based Scores from Python service
        try {
            const pythonRes = await axios.post(`${ML_API}/api/recommendations`, {
                viewed_ids,
                top_n: 12 // Get more to merge properly
            });
            if (pythonRes.data.success) {
                contentRecs = pythonRes.data.data.recommendations;
                const cScores = pythonRes.data.data.scores;
                
                contentRecs.forEach((item, idx) => {
                    combinedScores[item.id] = {
                        item,
                        content_score: cScores[idx],
                        collab_score: 0,
                        total_score: cScores[idx] * weights.content
                    };
                });
            }
        } catch (err) {
            console.error("Python ML Service missing or error:", err.message);
        }

        // 2. Get Collaborative Scores from TFJS Node Service
        if (userId) {
            try {
                const cRes = await collabFilter.getRecommendations(userId, 12);
                if (cRes.success) {
                    collabRecs = cRes.recommendations;
                    
                    collabRecs.forEach(async (rc) => {
                        const score = parseFloat(rc.collab_score);
                        if (combinedScores[rc.productId]) {
                            // Item already exists from content-based list — add collab score on top
                            combinedScores[rc.productId].collab_score = score;
                            combinedScores[rc.productId].total_score += (score * weights.collab);
                        } else {
                            // Collab-only item: fetch full product details from MongoDB
                            try {
                                const productDoc = await Product.findById(rc.productId);
                                if (productDoc) {
                                    combinedScores[rc.productId] = {
                                        item: {
                                            id:       productDoc._id.toString(),
                                            name:     productDoc.name,
                                            category: productDoc.category,
                                            price:    productDoc.price,
                                            image:    productDoc.image,
                                        },
                                        content_score: 0,
                                        collab_score:  score,
                                        total_score:   score * weights.collab,
                                    };
                                }
                            } catch (e) {
                                console.error(`Failed to fetch product ${rc.productId}:`, e.message);
                            }
                        }
                    });
                }
            } catch (err) {
                console.error("TFJS Collab Service error:", err.message);
            }
        }
        
        // Ensure catalog properties for Collab-only items
        const missingItemIds = collabRecs
            .map(r => r.productId)
            .filter(id => !combinedScores[id]);
            
        if (missingItemIds.length > 0) {
            try {
                const catRes = await axios.get(`${ML_API}/api/catalog`);
                if (catRes.data.success) {
                    const catalog = catRes.data.data;
                    missingItemIds.forEach(id => {
                        const matched = catalog.find(c => c.id === id);
                        if (matched) {
                            const sc = collabRecs.find(c => c.productId === id);
                            const score = parseFloat(sc.collab_score);
                            combinedScores[id] = {
                                item: matched,
                                content_score: 0,
                                collab_score: score,
                                total_score: score * weights.collab
                            };
                        }
                    });
                }
            } catch (e) {
               console.error("Failed to resolve missing catalog items:", e.message); 
            }
        }

        // 3. Sort and limit output
        const finalResults = Object.values(combinedScores)
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, top_n)
            .map(res => ({
                ...res.item,
                scores: {
                    total: res.total_score.toFixed(1),
                    content: res.content_score,
                    collab: res.collab_score
                }
            }));

        res.json({
            success: true,
            data: {
                algorithm: "hybrid_engine",
                weights_used: weights,
                recommendations: finalResults
            }
        });
        
    } catch (error) {
        console.error('Hybrid Recommendation Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   POST /api/recommendations/retrain
 * @desc    Manually trigger a TFJS collaborative filter retraining
 * @access  Admin
 */
router.post('/retrain', async (req, res) => {
    try {
        const result = await collabFilter.trainModel();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   POST /api/recommendations/track
 * @desc    Track a user interaction from the storefront (view, cart, purchase)
 * @access  Public
 */
router.post('/track', async (req, res) => {
    try {
        const { userId, productId, interactionType } = req.body;
        
        if (!userId || !productId || !interactionType) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const interaction = new UserInteraction({
            userId,
            productId,
            interactionType
        });
        
        await interaction.save(); // The pre-save hook automatically calculates the proper weight score

        res.json({
            success: true,
            message: "Interaction tracked successfully",
            data: interaction
        });
    } catch (err) {
        console.error("Failed to track interaction:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
