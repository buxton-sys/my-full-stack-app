import jwt from 'jsonwebtoken';
import Member from '../models/Member.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: "Access token required" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "MERCURE_SECRET_2025");
    
    // Get fresh user data from database
    const user = await Member.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "User not found" 
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        success: false,
        message: "Account pending approval" 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false,
      message: "Invalid or expired token" 
    });
  }
};

export const verifyAdmin = (req, res, next) => {
  const adminRoles = ['chairperson', 'deputy-secretary', 'secretary', 'treasurer', 'admin'];
  
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: "Admin access required" 
    });
  }
  
  next();
};