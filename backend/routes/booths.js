const express = require('express');
const { auth } = require('../middleware/auth');
const Booth = require('../models/Booth');

const router = express.Router();

router.get('/expo/:expoId', async (req, res) => {
  try {
    const booths = await Booth.find({ 
      expoId: req.params.expoId,
      status: 'approved'
    });
    res.json(booths);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限' });
    }
    const booths = await Booth.find({ status: 'pending' }).populate('ownerId', 'username email');
    res.json(booths);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id).populate('ownerId', 'username');
    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }
    res.json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, products, expoId, zoneName, positionPreference } = req.body;
    
    const booth = new Booth({
      name,
      description,
      products,
      expoId,
      zoneName,
      positionPreference,
      ownerId: req.user._id
    });

    await booth.save();
    res.status(201).json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.put('/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限' });
    }

    const { zone, position } = req.body;
    
    const booth = await Booth.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', zone, position },
      { new: true }
    );

    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }

    res.json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.put('/:id/reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限' });
    }

    const booth = await Booth.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }

    res.json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/my/:expoId', auth, async (req, res) => {
  try {
    const booth = await Booth.findOne({
      expoId: req.params.expoId,
      ownerId: req.user._id
    });
    res.json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
