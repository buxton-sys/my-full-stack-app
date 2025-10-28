import express from 'express';
import Announcement from '../models/announcement.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';
const router = express.Router();

// GET ALL ANNOUNCEMENTS
router.get('/', verifyToken, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('author', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch announcements" 
    });
  }
});

// CREATE ANNOUNCEMENT (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ 
        success: false,
        message: "Title and message are required" 
      });
    }

    const announcement = new Announcement({
      title,
      message,
      author: req.user._id
    });

    await announcement.save();
    
    // Populate author info
    await announcement.populate('author', 'name email role');

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      announcement
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to create announcement" 
    });
  }
});

export default router;