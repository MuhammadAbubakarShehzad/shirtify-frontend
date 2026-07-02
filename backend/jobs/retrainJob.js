const cron = require('node-cron');
const { trainModel } = require('../services/collaborativeFilter');

/**
 * Starts background tasks for the application
 */
function startJobs() {
    console.log("🗓️  Starting Background Jobs scheduler...");
    
    // Retrain the TFJS Collaborative Filter Model every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log(`[${new Date().toISOString()}] Executing Scheduled Retrain Job...`);
        try {
            await trainModel();
        } catch (err) {
            console.error("Scheduled Retrain Job Failed:", err);
        }
    });
}

module.exports = {
    startJobs
};
