import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from 'express-rate-limit';
import { connectSqlite, connectMongo, createTables, createDefaultAdmin } from './database.js';
import { errorHandler } from './middleware/errorMiddleware.js';

// Import routes and models
import authRoutes from "./routes/authRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import announcementRoutes from "./routes/announcementsRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import createAutomationRouter from './routes/automationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "MERCURE_SECRET_2025_REPLACE_IN_PROD";


// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.CORS_ORIGIN || "https://your-frontend-app.onrender.com")
    : "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Security: Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request body:', JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

// Database instance placeholder
let db;

// Test routes
app.get("/api/test-simple", (req, res) => {
  console.log("✅ Simple test route hit!");
  res.json({ message: "Backend is working!", timestamp: new Date() });
});

app.get("/api/health", (req, res) => {
  console.log("🏥 Health check received");
  res.json({ 
    status: "OK", 
    timestamp: new Date(),
    message: "Backend is running" 
  });
});

// ====================== AUTH MIDDLEWARE ======================
function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "Authorization header required" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token missing" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      if (requiredRole && decoded.role !== requiredRole)
        return res.status(403).json({ error: `Access denied: ${requiredRole} only` });

      req.user = decoded;
      next();
    });
  };
}

// ====================== SAVINGS, LOANS, FINES ROUTES ======================
// These routes were missing, causing timeouts on the frontend.

app.get("/api/get-savings", async (req, res, next) => {
  try {
    const rows = await db.all("SELECT s.*, m.name as member_name FROM savings s JOIN members m ON s.member_id = m.id ORDER BY date DESC");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/get-total-savings", async (req, res, next) => {
  try {
    const row = await db.get("SELECT SUM(amount) AS total_savings FROM savings");
    res.json({ total_savings: row.total_savings || 0 });
  } catch (err) {
    next(err);
  }
});

app.post("/api/add-savings", async (req, res, next) => {
  const { member_id, amount } = req.body;
  if (!member_id || !amount) {
    return res.status(400).json({ success: false, error: "Member ID and amount required" });
  }
  try {
    const result = await db.run("INSERT INTO savings (member_id, amount) VALUES (?, ?)", [member_id, amount]);
    res.json({ success: true, message: "Savings added!", id: result.lastID });
  } catch (err) {
    next(err);
  }
});

app.get("/api/get-loans", async (req, res, next) => {
  try {
    const query = `
      SELECT l.id, l.member_id, m.name AS member_name, l.amount, l.status, l.due_date
      FROM loans l JOIN members m ON l.member_id = m.id ORDER BY l.id DESC`;
    const rows = await db.all(query);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/request-loan", async (req, res, next) => {
  const { member_id, amount, purpose, reason, due_date } = req.body;
  if (!member_id || !amount || !purpose) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }
  try {
    const result = await db.run(
      "INSERT INTO loans (member_id, amount, principal_amount, purpose, reason, status, due_date) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
      [member_id, amount, amount, purpose, reason || null, due_date || null]
    );
    res.json({ success: true, message: "Loan requested", loan_id: result.lastID });
  } catch (err) {
    next(err);
  }
});

app.get("/api/get-fines", async (req, res, next) => {
  try {
    const query = `SELECT f.*, m.name AS member_name FROM fines f JOIN members m ON f.member_id = m.id ORDER BY date DESC`;
    const rows = await db.all(query);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/add-fine", async (req, res, next) => {
  const { member_id, amount, reason } = req.body;
  if (!member_id || !amount || !reason) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  try {
    const result = await db.run("INSERT INTO fines (member_id, amount, reason) VALUES (?, ?, ?)", [member_id, amount, reason]);
    res.json({ success: true, message: "Fine added successfully", fine_id: result.lastID });
  } catch (err) {
    next(err);
  }
});

// ====================== MEMBER EDIT/DELETE ROUTES ======================
// These routes are required for the edit and delete functionality on the Members page.

app.put("/api/members/:id", async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: "Name and email are required" });
  }
  try {
    const result = await db.run("UPDATE members SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?", [name, email, phone, role, id]);
    if (result.changes === 0) return res.status(404).json({ success: false, error: "Member not found" });
    res.json({ success: true, message: "Member updated successfully" });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/members/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.run("DELETE FROM members WHERE id = ?", id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: "Member not found" });
    res.json({ success: true, message: "Member deleted successfully" });
  } catch (err) {
    next(err);
  }
});


// ====================== DASHBOARD & LEADERBOARD ROUTES ======================
app.get("/api/group-stats", async (req, res, next) => {
  try {
    const [membersRow, savingsRow, loansRow] = await Promise.all([
      db.get("SELECT COUNT(*) AS total_members FROM members"),
      db.get("SELECT SUM(amount) AS total_savings FROM savings"),
      db.get("SELECT COUNT(*) AS active_loans FROM loans WHERE status='pending'")
    ]);
    res.json({
      total_members: membersRow?.total_members || 0,
      total_savings: savingsRow?.total_savings || 0,
      active_loans: loansRow?.active_loans || 0,
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api', leaderboardRoutes);

// ====================== AUTOMATION ROUTES ======================
app.use('/api/automation', createAutomationRouter(db));

// Route debugging
app.get("/api/debug-routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  res.json({ routes, total: routes.length });
});

// ====================== SERVER START ======================
app.get("/", (req, res) => res.send("Mercure API running!"));
app.get("/api/test", (req, res) => res.json({ message: "✅ API is working!" }));

// Use imported routes
// Auth routes
app.use('/api', authRoutes); // Handles /api/login, /api/register
// Member routes
app.use('/api/members', memberRoutes);
// Announcement routes
app.use('/api/announcements', announcementRoutes);

// Centralized Error Handler
app.use(errorHandler);

// ====================== PRODUCTION SETTINGS ======================
// Serve static files from the React frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't
// match one of the API routes above, send back React's index.html file.
// This is necessary for client-side routing to work in production.
app.get('*', (req, res) => {
  // Ensure the request is not for an API endpoint before sending index.html
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

/**
 * Initializes databases and starts the Express server.
 */
async function startServer() {
  console.log("🔄 Server starting...");
  console.log("📁 Current directory:", __dirname);
  console.log("🔧 Node version:", process.version);

  // Connect to databases
  db = await connectSqlite();
  await connectMongo();

  // Set up database schema and default data
  await createTables(db);
  await createDefaultAdmin(db);
# Create ALL missing files as empty placeholders
mkdir -p models middleware
touch models/Member.js
touch models/memberRoutes.js  
touch middleware/authMiddleware.js

# Add basic content to prevent errors
echo "export default {}" > models/Member.js
echo "export default {}" > models/memberRoutes.js
echo "export default function authMiddleware() { return (req, res, next) => next() }" > middleware/authMiddleware.js  
  // TODO: Instantiate and start the automation engine once models are finalized
  // new AutomationEngine();

  // Start the server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API available at: http://localhost:${PORT}/api`);
    console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`\n🎯 READY TO LOGIN WITH:`);
    console.log(`   Email: kevindelaquez@gmail.com`);
    console.log(`   Password: 867304`);
  });
}

startServer().catch(err => console.error("❌ Failed to start server:", err));
