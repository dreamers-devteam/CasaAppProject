const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  cash: { type: Number, default: 0 },
  bank: { type: Number, default: 1000 },
  lastDaily: { type: Date, default: null },
  lastBeg: { type: Date, default: null },
  lastLootbox: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  lastRob: { type: Date, default: null },
  transferUsed: { type: Number, default: 0 },
  receiveUsed: { type: Number, default: 0 },
  nextReset: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
