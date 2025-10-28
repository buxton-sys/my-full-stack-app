import express from 'express';
import Member from '../models/Member.js';

const router = express.Router();

router.get('/leaderboard', async (req, res) => {
  try {
    const data = await Member.find().sort({ score: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;