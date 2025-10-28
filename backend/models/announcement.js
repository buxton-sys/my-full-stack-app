import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
}, {
  timestamps: true,
});

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;