const express = require('express');
const { auth } = require('../middleware/auth');
const Expo = require('../models/Expo');
const Booth = require('../models/Booth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const expos = await Expo.find().sort({ createdAt: -1 });
    res.json(expos);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const expo = await Expo.findById(req.params.id);
    if (!expo) {
      return res.status(404).json({ message: '展会不存在' });
    }
    res.json(expo);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, startDate, endDate, coverImage } = req.body;
    
    const expo = new Expo({
      name,
      description,
      startDate,
      endDate,
      coverImage,
      createdBy: req.user._id
    });

    await expo.save();
    res.status(201).json(expo);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const expo = await Expo.findById(req.params.id);
    if (!expo) {
      return res.status(404).json({ message: '展会不存在' });
    }

    if (expo.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权限修改' });
    }

    const updatedExpo = await Expo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedExpo);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.post('/:id/zones', auth, async (req, res) => {
  try {
    const expo = await Expo.findById(req.params.id);
    if (!expo) {
      return res.status(404).json({ message: '展会不存在' });
    }

    expo.zones.push(req.body);
    await expo.save();

    res.json(expo.zones[expo.zones.length - 1]);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.put('/:id/zones/:zoneId', auth, async (req, res) => {
  try {
    const expo = await Expo.findById(req.params.id);
    if (!expo) {
      return res.status(404).json({ message: '展会不存在' });
    }

    const zone = expo.zones.id(req.params.zoneId);
    if (!zone) {
      return res.status(404).json({ message: '分区不存在' });
    }

    Object.assign(zone, req.body);
    await expo.save();

    res.json(zone);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.delete('/:id/zones/:zoneId', auth, async (req, res) => {
  try {
    const expo = await Expo.findById(req.params.id);
    if (!expo) {
      return res.status(404).json({ message: '展会不存在' });
    }

    expo.zones.pull(req.params.zoneId);
    await expo.save();

    res.json({ message: '分区已删除' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
