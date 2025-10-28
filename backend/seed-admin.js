const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./mercure.db');
const mongoose = require('mongoose');
const Announcement = require('./models/announcementModel');

// Seed Super Admin in SQLite
(async () => {
  const pass = await bcrypt.hash('YourStrongPassword1', 10);
  db.run("INSERT INTO members (name, username, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ['KEVIN BUXTON', 'kevin', 'kevinbuxton2005@gmail.com', '0116993286', pass, 'Super Admin', 'approved'],
    function(err) {
      if (err) console.error(err);
      else console.log('Super Admin created, id=', this.lastID);
      db.close();
    });
})();

mongoose.connect('mongodb://localhost:27017/mercure', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB for announcements seeding');
    const Announcement = require('./models/AnnouncementSchema');

    const seedAnnouncements = async () => {
      const announcements = [
        {
          title: 'Welcome to Mercure!',
          message: 'We are excited to have you on board. Stay tuned for upcoming events and updates.',
        },
        {
          title: 'System Maintenance',
          message: 'The system will undergo maintenance on Saturday from 1 AM to 3 AM. Please plan accordingly.',
        },
      ];
      for (const ann of announcements) {
        const newAnn = new Announcement(ann);
        await newAnn.save();
        console.log(`Announcement titled "${ann.title}" created.`);
      }
      mongoose.connection.close();
    };

    seedAnnouncements();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });