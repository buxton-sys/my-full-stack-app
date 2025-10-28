import express from 'express';
const router = express.Router();
const db = require('../database'); // Your SQLite database

// Initialize automation system (we'll create this next)
const AutomatedReminders = require('../automation/automatedReminders');
const automation = new AutomatedReminders();

// Get automation status
router.get('/status', (req, res) => {
  try {
    const status = automation.getStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('❌ Automation status error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Manual trigger for morning prompts
router.post('/trigger/morning', async (req, res) => {
  try {
    console.log('🔄 Manual morning trigger received');
    await automation.sendSTKPushPrompts('morning');
    res.json({ 
      success: true,
      message: 'Morning STK Push prompts triggered manually' 
    });
  } catch (error) {
    console.error('❌ Manual trigger error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Manual trigger for evening prompts
router.post('/trigger/evening', async (req, res) => {
  try {
    console.log('🔄 Manual evening trigger received');
    await automation.sendSTKPushPrompts('evening');
    res.json({ 
      success: true,
      message: 'Evening STK Push prompts triggered manually' 
    });
  } catch (error) {
    console.error('❌ Manual trigger error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Send manual STK Push prompts
router.post('/send-prompt', async (req, res) => {
  try {
    const { userPhones, amount, paymentType, description } = req.body;

    if (!userPhones || !amount || !paymentType) {
      return res.status(400).json({ 
        success: false,
        error: 'userPhones, amount, and paymentType are required' 
      });
    }

    console.log(`👑 Super Admin manual STK Push: Ksh ${amount} for ${paymentType} to ${userPhones.length} users`);

    const result = await automation.sendManualSTKPrompt(userPhones, amount, paymentType, description);

    if (result.success) {
      const successCount = result.results.filter(r => r.status === 'success').length;
      res.json({
        success: true,
        message: `STK Push prompts sent to ${successCount} users`,
        results: result.results
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Manual prompt error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get members for manual selection
router.get('/members', (req, res) => {
  db.all("SELECT id, name, phone, email, role FROM members WHERE status = 'approved'", (err, rows) => {
    if (err) {
      console.error('❌ Error fetching members:', err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    res.json({
      success: true,
      members: rows
    });
  });
});

module.exports = router;