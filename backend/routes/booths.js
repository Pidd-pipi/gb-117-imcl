const express = require('express');
const { auth } = require('../middleware/auth');
const Booth = require('../models/Booth');
const User = require('../models/User');

const router = express.Router();

router.get('/expo/:expoId', async (req, res) => {
  try {
    const booths = await Booth.find({
      expoId: req.params.expoId,
      status: 'approved'
    })
      .populate('ownerId', 'username')
      .populate('partnerId', 'username');
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

// 当前用户收到的待处理合摊邀请
router.get('/invites/received', auth, async (req, res) => {
  try {
    const booths = await Booth.find({ 'partnerInvite.inviteeId': req.user._id })
      .populate('ownerId', 'username')
      .populate('expoId', 'name');
    res.json(booths);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/my/:expoId', auth, async (req, res) => {
  try {
    const booth = await Booth.findOne({
      expoId: req.params.expoId,
      $or: [{ ownerId: req.user._id }, { partnerId: req.user._id }]
    })
      .populate('ownerId', 'username')
      .populate('partnerId', 'username')
      .populate('partnerInvite.inviteeId', 'username email');
    res.json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id)
      .populate('ownerId', 'username')
      .populate('partnerId', 'username');
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

// 摊主或合摊伙伴维护摊位介绍、商品清单、位置偏好
router.put('/:id', auth, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }

    const userId = String(req.user._id);
    const isOwner = String(booth.ownerId) === userId;
    const isPartner = booth.partnerId && String(booth.partnerId) === userId;
    if (!isOwner && !isPartner) {
      return res.status(403).json({ message: '只有摊主或合摊伙伴可以修改摊位信息' });
    }

    const { description, products, positionPreference } = req.body;
    if (description !== undefined) booth.description = description;
    if (products !== undefined) booth.products = products;
    if (positionPreference !== undefined) booth.positionPreference = positionPreference;

    await booth.save();
    res.json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 摊主按邮箱邀请已注册用户合摊
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }
    if (String(booth.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: '只有摊主可以邀请合摊伙伴' });
    }
    if (booth.status !== 'approved') {
      return res.status(400).json({ message: '摊位通过审核后才能邀请合摊伙伴' });
    }

    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: '请输入对方邮箱' });
    }

    if (booth.partnerId) {
      return res.status(400).json({ message: '该摊位已有合摊伙伴，无法再次邀请' });
    }
    if (booth.partnerInvite && booth.partnerInvite.inviteeId) {
      if (booth.partnerInvite.email === email) {
        return res.status(400).json({ message: '已邀请过该伙伴，请等待对方确认' });
      }
      return res.status(400).json({ message: '已有待确认的合摊邀请，请先撤回再邀请' });
    }

    const invitee = await User.findOne({ email });
    if (!invitee) {
      return res.status(400).json({ message: '该邮箱尚未注册，无法邀请' });
    }
    if (String(invitee._id) === String(req.user._id)) {
      return res.status(400).json({ message: '不能邀请自己' });
    }

    // 原子写入，避免并发下重复邀请或越过已有伙伴
    const updated = await Booth.findOneAndUpdate(
      { _id: booth._id, status: 'approved', partnerId: null, partnerInvite: null },
      { $set: { partnerInvite: { email, inviteeId: invitee._id, invitedAt: new Date() } } },
      { new: true }
    );
    if (!updated) {
      return res.status(400).json({ message: '该摊位已有合摊伙伴或待确认的邀请' });
    }

    res.json({ message: `已向 ${invitee.username} 发出合摊邀请`, booth: updated });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 摊主撤回合摊邀请（与对方接受并发时，只保留先完成的一方结果）
router.delete('/:id/invite', auth, async (req, res) => {
  try {
    const booth = await Booth.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, 'partnerInvite.inviteeId': { $exists: true } },
      { $unset: { partnerInvite: 1 } },
      { new: true }
    );

    if (!booth) {
      const existing = await Booth.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: '摊位不存在' });
      }
      if (String(existing.ownerId) !== String(req.user._id)) {
        return res.status(403).json({ message: '只有摊主可以撤回邀请' });
      }
      if (existing.partnerId) {
        return res.status(400).json({ message: '对方已接受邀请，无法撤回' });
      }
      return res.status(400).json({ message: '没有待撤回的邀请' });
    }

    res.json({ message: '邀请已撤回', booth });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 被邀请人接受合摊邀请（与摊主撤回并发时，只保留先完成的一方结果）
router.post('/:id/invite/accept', auth, async (req, res) => {
  try {
    const booth = await Booth.findOneAndUpdate(
      { _id: req.params.id, 'partnerInvite.inviteeId': req.user._id, partnerId: null },
      { $set: { partnerId: req.user._id }, $unset: { partnerInvite: 1 } },
      { new: true }
    );

    if (!booth) {
      const existing = await Booth.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: '摊位不存在' });
      }
      if (existing.partnerId) {
        return res.status(400).json({ message: '该摊位已有合摊伙伴' });
      }
      return res.status(400).json({ message: '邀请不存在或已被摊主撤回' });
    }

    res.json({ message: '已接受邀请，你已成为该摊位的合摊伙伴', booth });
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

module.exports = router;
