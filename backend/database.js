import sqlite3 from 'sqlite3';
import mongoose from 'mongoose';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

const SQLITE_DB_PATH = process.env.DATABASE_PATH || './mercure.db';
const MONGO_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mercury_db';

/**
 * Connects to the SQLite database and returns the database instance.
 * @returns {Promise<import('sqlite').Database>}
 */
export async function connectSqlite() {
  try {
    const db = await open({
      filename: SQLITE_DB_PATH,
      driver: sqlite3.Database,
    });
    console.log('✅ SQLite DB connected');
    return db;
  } catch (err) {
    console.error('❌ SQLite DB connection error:', err.message);
    process.exit(1); // Exit if we can't connect to the DB
  }
}

/**
 * Connects to the MongoDB database.
 */
export async function connectMongo() {
  try {
    await mongoose.connect(MONGO_DB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit if we can't connect to the DB
  }
}

/**
 * Creates database tables if they don't exist.
 * @param {import('sqlite').Database} db - The SQLite database instance.
 */
export async function createTables(db) {
  console.log('🔄 Creating/checking database tables...');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, username TEXT UNIQUE, phone TEXT, email TEXT,
      password TEXT, role TEXT DEFAULT 'Member', balance REAL DEFAULT 0, status TEXT DEFAULT 'approved',
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL, date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, type TEXT, amount REAL, date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS afterschool (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL, date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL, principal_amount REAL DEFAULT 0,
      interest REAL DEFAULT 0, late_penalty REAL DEFAULT 0, purpose TEXT, reason TEXT, status TEXT DEFAULT 'pending',
      due_date DATE
    );
    CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL, reason TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid INTEGER DEFAULT 0, FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sms_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL, phone_number TEXT, external_reference_id TEXT UNIQUE,
      message TEXT, payment_type TEXT DEFAULT 'savings', prompt_type TEXT DEFAULT 'auto', prompt_time TEXT,
      status TEXT DEFAULT 'pending', mpesa_reference TEXT, result_code TEXT, result_desc TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME, FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE IF NOT EXISTS automation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, action_type TEXT, description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE IF NOT EXISTS pending_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER, amount REAL, payment_type TEXT, description TEXT,
      prompt_type TEXT DEFAULT 'auto', prompt_time TEXT, status TEXT DEFAULT 'pending', mpesa_reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME, FOREIGN KEY (member_id) REFERENCES members(id)
    );
member_code TEXT UNIQUE,
total_savings REAL DEFAULT 0,
debts REAL DEFAULT 0, 
afterschool REAL DEFAULT 0, 
loans REAL DEFAULT 0, 
fines REAL DEFAULT 0
  `);
  );
  console.log('✅ Database tables created/checked.');
}

/**
 * Creates a default admin user if one doesn't exist.
 * @param {import('sqlite').Database} db - The SQLite database instance.
 */
export async function createDefaultAdmin(db) {
  try {
    const admin = await db.get("SELECT * FROM members WHERE email = ?", 'kevindelaquez@gmail.com');
    if (!admin) {
      const hashedPassword = await bcrypt.hash('867304', 10);
      await db.run(
        `INSERT INTO members (name, email, password, username, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['KEVIN BUXTON', 'kevindelaquez@gmail.com', hashedPassword, 'delaquez', 'treasurer', 'approved']
      );
      console.log('✅ SUPER ADMIN USER CREATED in SQLite:');
      console.log('   Email: kevindelaquez@gmail.com');
      console.log('   Password: 867304');
    } else {
      console.log('✅ Super admin user already exists in SQLite');
    }
  } catch (error) {
    console.error('❌ Admin creation error:', error.message);
  }

}
