const express = require('express');
const { auth } = require('../middleware/auth');
const Review = require('../models/Review');

const router = express.Router();

router.get('/booth/:boothId', async (req, res) => {
  try {
    const reviews = await Review.find({ boothId: req.params.boothId })
      .populate('userId', 'username')
      .sort({ createdAt: -1 });
    
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    res.json({ reviews, avgRating });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { boothId, expoId, rating, comment } = req.body;
    
    const existing = await Review.findOne({
      userId: req.user._id,
      boothId
    });

    if (existing) {
      return res.status(400).json({ message: '已评价过该摊位' });
    }

    const review = new Review({
      userId: req.user._id,
      boothId,
      expoId,
      rating,
      comment
    });

    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
