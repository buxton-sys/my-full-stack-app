import express from 'express';
const router = express.Router();

// Add your auth routes here
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

export default router;