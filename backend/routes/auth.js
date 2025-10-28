import express from 'express';
import jwt from 'jsonwebtoken';
import Member from '../models/Member.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// REGISTER - Creates a pending member
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, idNumber, dateOfBirth, username, role } = req.body;

    // Check if user already exists
    const existingUser = await Member.findOne({ 
      $or: [{ email }, { username }, { idNumber }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "User with this email, username, or ID already exists" 
      });
    }

    // Create new member with pending status
    const member = new Member({
      name,
      email,
      password,
      phone,
      idNumber,
      dateOfBirth,
      username,
      role: role || 'guest',
      status: 'pending' // All new registrations are pending
    });

    await member.save();

    res.status(201).json({
      success: true,
      message: "Registration successful! Waiting for admin approval.",
      member: {
        id: member._id,
        name: member.name,
        email: member.email,
        status: member.status
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error during registration" 
    });
  }
});

// LOGIN - Only works for approved members
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password required" 
      });
    }

    // Find member
    const member = await Member.findOne({ email });
    if (!member) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Check if account is approved
    if (member.status !== 'approved') {
      return res.status(403).json({ 
        success: false,
        message: "Account pending admin approval" 
      });
    }

    // Check password
    const isPasswordValid = await member.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: member._id, 
        role: member.role,
        email: member.email 
      },
      process.env.JWT_SECRET || "MERCURE_SECRET_2025",
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      role: member.role,
      user: {
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        username: member.username
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error during login" 
    });
  }
});

// GET CURRENT USER
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;