const express = require('express');
const { auth } = require('../middleware/auth');
const Favorite = require('../models/Favorite');

const router = express.Router();

router.get('/my', auth, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id })
      .populate('boothId', 'name description zoneName');
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/expo/:expoId', auth, async (req, res) => {
  try {
    const favorites = await Favorite.find({ 
      userId: req.user._id,
      expoId: req.params.expoId
    });
    const boothIds = favorites.map(f => f.boothId.toString());
    res.json(boothIds);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { boothId, expoId } = req.body;
    
    const existing = await Favorite.findOne({
      userId: req.user._id,
      boothId
    });

    if (existing) {
      return res.status(400).json({ message: '已收藏该摊位' });
    }

    const favorite = new Favorite({
      userId: req.user._id,
      boothId,
      expoId
    });

    await favorite.save();
    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.delete('/:boothId', auth, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      userId: req.user._id,
      boothId: req.params.boothId
    });

    res.json({ message: '已取消收藏' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
