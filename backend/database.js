const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mercure.db');

// Create members table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    balance REAL DEFAULT 0,
    role TEXT DEFAULT 'member'
  )
`);

console.log("Database connected & table ready ✅");

module.exports = db;

// Savings table
db.run(`
    CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER,
        amount REAL NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(member_id) REFERENCES members(id)
    )
`);

// Transactions table
db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER,
        type TEXT CHECK(type IN ('deposit', 'withdraw')),
        amount REAL NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(member_id) REFERENCES members(id)
    )
`);
