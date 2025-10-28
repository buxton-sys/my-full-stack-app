const express = require('express');
const router = express.Router();
const AutomationEngine = require('../server/automation');

const automation = new AutomationEngine();

// Manual trigger endpoints (for testing)
router.post('/trigger/daily', async (req, res) => {
  try {
    await automation.checkOverdueLoans();
    await automation.checkInactiveMembers();
    await automation.checkMissedSavings();
    res.json({ message: 'Daily automation triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trigger/weekly', async (req, res) => {
  try {
    await automation.applyWeeklyInterest();
    await automation.applyWeeklyPenalties();
    res.json({ message: 'Weekly automation triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get automation status
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    lastDailyRun: automation.lastDailyRun,
    lastWeeklyRun: automation.lastWeeklyRun,
    nextDailyRun: automation.nextDailyRun,
    nextWeeklyRun: automation.nextWeeklyRun
  });
});

module.exports = router;