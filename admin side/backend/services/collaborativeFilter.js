const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const UserInteraction = require('../models/UserInteraction');

const MODEL_DIR = path.join(__dirname, '..', 'models', 'tfjs_collab');
const MAPPING_FILE = path.join(MODEL_DIR, 'mappings.json');
const MODEL_URL = `file://${MODEL_DIR}/model.json`;

let model = null;
let userMap = {};
let productMap = {};
let reverseProductMap = {};
let numUsers = 0;
let numProducts = 0;

/**
 * Initialize directory if it doesn't exist
 */
function initDir() {
    if (!fs.existsSync(MODEL_DIR)) {
        fs.mkdirSync(MODEL_DIR, { recursive: true });
    }
}

/**
 * Load mappings from disk
 */
function loadMappings() {
    if (fs.existsSync(MAPPING_FILE)) {
        const data = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
        userMap = data.userMap;
        productMap = data.productMap;
        reverseProductMap = data.reverseProductMap;
        numUsers = data.numUsers;
        numProducts = data.numProducts;
    }
}

/**
 * Save mappings to disk
 */
function saveMappings() {
    initDir();
    const data = { userMap, productMap, reverseProductMap, numUsers, numProducts };
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(data), 'utf8');
}

/**
 * Load the entire model into memory
 */
async function loadModel() {
    try {
        if (!fs.existsSync(path.join(MODEL_DIR, 'model.json'))) {
            return false;
        }
        model = await tf.loadLayersModel(MODEL_URL);
        loadMappings();
        return true;
    } catch (err) {
        console.error("Failed to load TFJS model:", err);
        return false;
    }
}

/**
 * Build and compile the Model
 */
function buildModel(numUsers, numProducts, embeddingSize = 32) {
    // User Input & Embedding
    const userInput = tf.input({ shape: [1], name: 'user_input' });
    const userEmbedding = tf.layers.embedding({
        inputDim: numUsers + 1, // +1 for unseen users
        outputDim: embeddingSize,
        name: 'user_embedding'
    }).apply(userInput);
    const userVec = tf.layers.flatten().apply(userEmbedding);

    // Product Input & Embedding
    const productInput = tf.input({ shape: [1], name: 'product_input' });
    const productEmbedding = tf.layers.embedding({
        inputDim: numProducts + 1, // +1 for unseen products
        outputDim: embeddingSize,
        name: 'product_embedding'
    }).apply(productInput);
    const productVec = tf.layers.flatten().apply(productEmbedding);

    // Dot Product of User and Product Embeddings
    const dotProduct = tf.layers.dot({ axes: 1 }).apply([userVec, productVec]);

    // Build Model
    const model = tf.model({
        inputs: [userInput, productInput],
        outputs: dotProduct
    });

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError'
    });

    return model;
}

/**
 * Fetch interactions and extract unique users and products mappings
 */
async function prepareData() {
    const interactions = await UserInteraction.find({});
    
    userMap = {};
    productMap = {};
    reverseProductMap = {};
    numUsers = 0;
    numProducts = 0;

    const xsUser = [];
    const xsProduct = [];
    const ysScore = [];

    // Create mappings and populate arrays
    interactions.forEach(interaction => {
        if (!(interaction.userId in userMap)) {
            numUsers++;
            userMap[interaction.userId] = numUsers;
        }
        if (!(interaction.productId in productMap)) {
            numProducts++;
            productMap[interaction.productId] = numProducts;
            reverseProductMap[numProducts] = interaction.productId;
        }

        xsUser.push(userMap[interaction.userId]);
        xsProduct.push(productMap[interaction.productId]);
        ysScore.push(interaction.score);
    });

    return { xsUser, xsProduct, ysScore };
}

/**
 * Train the Collaborative Filter Model
 */
async function trainModel() {
    console.log("Starting Collaborative Filtering Retraining...");
    
    const { xsUser, xsProduct, ysScore } = await prepareData();
    
    if (xsUser.length === 0) {
        console.log("No interactions found. Skipping training.");
        return { success: false, message: "No data" };
    }

    model = buildModel(numUsers, numProducts);

    // Convert to Tensors
    const tUser = tf.tensor1d(xsUser, 'int32');
    const tProduct = tf.tensor1d(xsProduct, 'int32');
    const tScore = tf.tensor1d(ysScore, 'float32');

    // Train Model
    await model.fit([tUser, tProduct], tScore, {
        epochs: 15,
        batchSize: 64,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                console.log(`Epoch ${epoch + 1} - Loss: ${logs.loss.toFixed(4)}`);
            }
        }
    });

    // Cleanup Tensors
    tUser.dispose();
    tProduct.dispose();
    tScore.dispose();

    // Save Model and Mappings
    initDir();
    await model.save(MODEL_URL);
    saveMappings();
    
    console.log("Model trained and saved to disk.");
    return { success: true, message: "Training complete" };
}

/**
 * Get Recommendations for a specific user
 * using Matrix Factorization
 */
async function getRecommendations(userId, topN = 4) {
    // Lazy load model if missing
    if (!model) {
        const loaded = await loadModel();
        if (!loaded) return { success: false, recommendations: [] };
    }

    // Identify User ID
    const uIdx = (userId in userMap) ? userMap[userId] : 0; // 0 for unknown user

    // Predict scores for all products
    const productIndices = Object.values(productMap);
    if (productIndices.length === 0) return { success: false, recommendations: [] };

    // Create tensors for predictions
    // Batch process: 1 user vs All Products
    const userArr = new Array(productIndices.length).fill(uIdx);
    
    const tUser = tf.tensor1d(userArr, 'int32');
    const tProduct = tf.tensor1d(productIndices, 'int32');

    // Make Prediction
    const predictions = model.predict([tUser, tProduct]);
    const scores = await predictions.data();

    // Clean up
    tUser.dispose();
    tProduct.dispose();
    predictions.dispose();

    // Combine products with predicted scores
    const scoredProducts = productIndices.map((pIdx, i) => ({
        productId: reverseProductMap[pIdx],
        score: scores[i]
    }));

    // Sort by descending score
    scoredProducts.sort((a, b) => b.score - a.score);

    // Get top N
    const topProducts = scoredProducts.slice(0, topN);

    // Normalize scores to 0-100% logic
    // Max score possible is technically unbounded but typically between 0-5.
    const maxScore = Math.max(5, ...scoredProducts.map(p => p.score));

    return {
        success: true,
        recommendations: topProducts.map(p => ({
            productId: p.productId,
            collab_score: Math.min(Math.max((p.score / maxScore) * 100, 0), 100).toFixed(1),
            raw_score: p.score
        }))
    };
}

module.exports = {
    trainModel,
    getRecommendations,
    loadModel
};
