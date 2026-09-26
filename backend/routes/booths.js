const express = require('express');
const { auth } = require('../middleware/auth');
const Booth = require('../models/Booth');
const User = require('../models/User');

const router = express.Router();

// 填充摊主与合摊伙伴昵称
const populateMembers = (query) => query
  .populate('ownerId', 'username')
  .populate('partnerId', 'username');

// 把邀请中的被邀请人也填充昵称
const populateInvitations = (query) => query
  .populate('invitations.inviteeId', 'username email');

router.get('/expo/:expoId', async (req, res) => {
  try {
    const booths = await populateMembers(Booth.find({
      expoId: req.params.expoId,
      status: 'approved'
    }));
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
    const booths = await Booth.find({ status: 'pending' })
      .populate('ownerId', 'username email')
      .populate('partnerId', 'username email');
    res.json(booths);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 当前用户收到的待处理合摊邀请（伙伴在展会页接受邀请）
router.get('/invitations/mine', auth, async (req, res) => {
  try {
    const query = {
      'invitations': {
        $elemMatch: { inviteeId: req.user._id, status: 'pending' }
      }
    };
    if (req.query.expoId) {
      query.expoId = req.query.expoId;
    }

    const booths = await populateInvitations(
      populateMembers(Booth.find(query))
    );

    const invitations = booths.flatMap(booth =>
      booth.invitations
        .filter(inv =>
          inv.inviteeId && inv.inviteeId._id.toString() === req.user._id.toString() &&
          inv.status === 'pending'
        )
        .map(inv => ({
          _id: inv._id,
          boothId: booth._id,
          boothName: booth.name,
          expoId: booth.expoId,
          email: inv.email,
          status: inv.status,
          createdAt: inv.createdAt,
          owner: booth.ownerId
        }))
    );

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/my/:expoId', auth, async (req, res) => {
  try {
    // 摊主或合摊伙伴都能查到与自己相关的摊位
    const booth = await populateInvitations(
      populateMembers(
        Booth.findOne({
          expoId: req.params.expoId,
          $or: [{ ownerId: req.user._id }, { partnerId: req.user._id }]
        })
      )
    );
    res.json(booth);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const booth = await populateInvitations(populateMembers(Booth.findById(req.params.id)));
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

// 摊主按邮箱邀请已注册伙伴（仅限已通过摊位）
router.post('/:id/invitations', auth, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: '请填写伙伴的注册邮箱' });
    }

    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }
    if (booth.status !== 'approved') {
      return res.status(400).json({ message: '摊位审核通过后才能邀请合摊伙伴' });
    }
    if (booth.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '只有摊主可以邀请合摊伙伴' });
    }
    if (booth.partnerId) {
      return res.status(400).json({ message: '该摊位已有合摊伙伴，不能重复邀请' });
    }

    const invitee = await User.findOne({ email });
    if (!invitee) {
      return res.status(400).json({ message: '该邮箱尚未注册，请邀请伙伴先注册账号' });
    }
    if (invitee._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: '不能邀请自己合摊' });
    }

    const pendingToSame = booth.invitations.some(
      inv => inv.inviteeId.toString() === invitee._id.toString() && inv.status === 'pending'
    );
    if (pendingToSame) {
      return res.status(400).json({ message: '已向该伙伴发出邀请，等待对方回复中，请勿重复邀请' });
    }

    // 原子写入：兜底并发下的重复邀请与已有伙伴
    const result = await Booth.updateOne(
      {
        _id: booth._id,
        partnerId: null,
        $nor: [
          { invitations: { $elemMatch: { inviteeId: invitee._id, status: 'pending' } } }
        ]
      },
      {
        $push: {
          invitations: { email, inviteeId: invitee._id, status: 'pending' }
        }
      }
    );

    if (result.matchedCount === 0) {
      const fresh = await Booth.findById(booth._id);
      if (fresh.partnerId) {
        return res.status(400).json({ message: '该摊位已有合摊伙伴，不能重复邀请' });
      }
      return res.status(400).json({ message: '已向该伙伴发出邀请，等待对方回复中，请勿重复邀请' });
    }

    const saved = await Booth.findById(booth._id);
    res.status(201).json({ message: '邀请已发送', invitation: saved.invitations[saved.invitations.length - 1] });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 摊主查看邀请进展
router.get('/:id/invitations', auth, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }
    if (booth.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '只有摊主可以查看邀请进展' });
    }

    await booth.populate('invitations.inviteeId', 'username email');
    res.json(booth.invitations);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 摊主撤回邀请：与对方接受同时到达时，只留下先完成的一方
router.post('/:id/invitations/cancel', auth, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }
    if (booth.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '只有摊主可以撤回邀请' });
    }

    // 单文档原子条件更新：邀请仍挂起才撤回成功
    const result = await Booth.updateOne(
      {
        _id: booth._id,
        partnerId: null,
        invitations: { $elemMatch: { status: 'pending' } }
      },
      {
        $set: {
          'invitations.$[inv].status': 'cancelled',
          'invitations.$[inv].respondedAt': new Date()
        }
      },
      { arrayFilters: [{ 'inv.status': 'pending' }] }
    );

    if (result.matchedCount === 0) {
      if (booth.partnerId) {
        return res.status(400).json({ message: '邀请已被接受，合摊关系已建立，无法撤回' });
      }
      return res.status(400).json({ message: '没有待撤回的邀请' });
    }

    res.json({ message: '邀请已撤回' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 伙伴接受邀请
router.post('/:id/invitations/accept', auth, async (req, res) => {
  try {
    // 原子完成：我的邀请仍挂起且摊位无伙伴时，建立合摊关系并接受该邀请
    const result = await Booth.updateOne(
      {
        _id: req.params.id,
        partnerId: null,
        invitations: {
          $elemMatch: { inviteeId: req.user._id, status: 'pending' }
        }
      },
      {
        $set: {
          partnerId: req.user._id,
          'invitations.$[mine].status': 'accepted',
          'invitations.$[mine].respondedAt': new Date()
        }
      },
      {
        arrayFilters: [
          { 'mine.inviteeId': req.user._id, 'mine.status': 'pending' }
        ]
      }
    );

    if (result.matchedCount === 0) {
      const booth = await Booth.findById(req.params.id);
      if (!booth) {
        return res.status(404).json({ message: '摊位不存在' });
      }
      const mine = booth.invitations.find(
        inv => inv.inviteeId.toString() === req.user._id.toString()
      );
      if (!mine) {
        return res.status(404).json({ message: '没有发给你的合摊邀请' });
      }
      if (mine.status === 'cancelled') {
        return res.status(400).json({ message: '摊主已撤回邀请，无法接受' });
      }
      if (mine.status === 'accepted') {
        return res.status(400).json({ message: '你已接受过该邀请' });
      }
      if (mine.status === 'declined') {
        return res.status(400).json({ message: '你已拒绝该邀请' });
      }
      return res.status(400).json({ message: '该摊位已有合摊伙伴，无法接受' });
    }

    // 同一摊位其余挂起邀请作废（合摊伙伴已确定）
    await Booth.updateOne(
      { _id: req.params.id },
      {
        $set: {
          'invitations.$[other].status': 'cancelled',
          'invitations.$[other].respondedAt': new Date()
        }
      },
      { arrayFilters: [{ 'other.status': 'pending' }] }
    );

    res.json({ message: '已接受邀请，你们现在共同维护该摊位' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 伙伴拒绝邀请
router.post('/:id/invitations/decline', auth, async (req, res) => {
  try {
    const result = await Booth.updateOne(
      {
        _id: req.params.id,
        'invitations': {
          $elemMatch: { inviteeId: req.user._id, status: 'pending' }
        }
      },
      {
        $set: {
          'invitations.$[mine].status': 'declined',
          'invitations.$[mine].respondedAt': new Date()
        }
      },
      {
        arrayFilters: [
          { 'mine.inviteeId': req.user._id, 'mine.status': 'pending' }
        ]
      }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({ message: '邀请不存在或已处理，无法拒绝' });
    }

    res.json({ message: '已拒绝邀请' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 摊主与合摊伙伴共同维护摊位介绍、商品清单和位置偏好
router.put('/:id', auth, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ message: '摊位不存在' });
    }

    const isOwner = booth.ownerId.toString() === req.user._id.toString();
    const isPartner = booth.partnerId && booth.partnerId.toString() === req.user._id.toString();
    if (!isOwner && !isPartner) {
      return res.status(403).json({ message: '只有摊主和合摊伙伴可以维护该摊位' });
    }
    if (booth.status !== 'approved') {
      return res.status(400).json({ message: '摊位审核通过后才能维护信息' });
    }

    const fields = ['description', 'products', 'positionPreference'];
    const updates = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updated = await populateMembers(
      Booth.findByIdAndUpdate(booth._id, { $set: updates }, { new: true })
    );
    res.json(updated);
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
