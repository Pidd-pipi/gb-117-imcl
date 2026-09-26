const express = require('express');
const { auth } = require('../middleware/auth');
const Schedule = require('../models/Schedule');

const router = express.Router();

router.get('/expo/:expoId', async (req, res) => {
  try {
    const schedules = await Schedule.find({ expoId: req.params.expoId }).sort({ startTime: 1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const schedule = new Schedule({
      ...req.body,
      createdBy: req.user._id
    });

    await schedule.save();
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({ message: '活动不存在' });
    }

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: '活动不存在' });
    }

    res.json({ message: '活动已删除' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
