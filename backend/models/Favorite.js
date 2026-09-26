const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boothId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booth',
    required: true
  },
  expoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expo',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

favoriteSchema.index({ userId: 1, boothId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
