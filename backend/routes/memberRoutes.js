import express from 'express';
import Member from '../models/member.js';

const router = express.Router();

// GET ALL MEMBERS (Admin only)
router.get('/', async (req, res) => {
  try {
    const members = await Member.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      members
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch members" 
    });
  }
});

// GET PENDING MEMBERS (Admin only)
router.get('/pending', async (req, res) => {
  try {
    const pendingMembers = await Member.find({ status: 'pending' }).select('-password');
    res.json({
      success: true,
      pendingMembers
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch pending members" 
    });
  }
});

// APPROVE MEMBER (Admin only)
router.put('/:id/approve', async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!member) {
      return res.status(404).json({ 
        success: false,
        message: "Member not found" 
      });
    }

    res.json({
      success: true,
      message: "Member approved successfully",
      member
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to approve member" 
    });
  }
});

// REJECT MEMBER (Admin only)
router.put('/:id/reject', async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).select('-password');

    if (!member) {
      return res.status(404).json({ 
        success: false,
        message: "Member not found" 
      });
    }

    res.json({
      success: true,
      message: "Member rejected",
      member
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to reject member" 
    });
  }
});

// GET MEMBER STATS
router.get('/stats', async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments({ status: 'approved' });
    const pendingMembers = await Member.countDocuments({ status: 'pending' });
    const totalSavings = await Member.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$totalSavings' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalMembers,
        pendingMembers,
        totalSavings: totalSavings[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch stats" 
    });
  }
});


export default router;
