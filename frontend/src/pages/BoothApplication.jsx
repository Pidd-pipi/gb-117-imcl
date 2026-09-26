import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { expoAPI, boothAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function BoothApplication() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expo, setExpo] = useState(null)
  const [myBooth, setMyBooth] = useState(null)
  const [editForm, setEditForm] = useState({ description: '', products: '', positionPreference: '' })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    products: '',
    zoneName: '',
    positionPreference: ''
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadExpo()
    loadMyBooth()
  }, [id, user])

  const loadExpo = async () => {
    try {
      const res = await expoAPI.getById(id)
      setExpo(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadMyBooth = async () => {
    try {
      const res = await boothAPI.getMyBooth(id)
      setMyBooth(res.data)
      if (res.data) {
        setEditForm({
          description: res.data.description || '',
          products: res.data.products || '',
          positionPreference: res.data.positionPreference || ''
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await boothAPI.create({ ...form, expoId: id })
      alert('申请已提交，请等待审核！')
      loadMyBooth()
    } catch (err) {
      alert('提交失败')
    }
  }

  const sendInvite = async (e) => {
    e.preventDefault()
    setInviteMsg(null)
    try {
      const res = await boothAPI.invitePartner(myBooth._id, inviteEmail)
      setInviteMsg({ type: 'success', text: res.data.message })
      setInviteEmail('')
      loadMyBooth()
    } catch (err) {
      setInviteMsg({ type: 'error', text: err.response?.data?.message || '邀请失败' })
    }
  }

  const withdrawInvite = async () => {
    setInviteMsg(null)
    try {
      const res = await boothAPI.withdrawInvite(myBooth._id)
      setInviteMsg({ type: 'success', text: res.data.message })
      loadMyBooth()
    } catch (err) {
      setInviteMsg({ type: 'error', text: err.response?.data?.message || '撤回失败' })
      loadMyBooth()
    }
  }

  const saveBooth = async (e) => {
    e.preventDefault()
    try {
      await boothAPI.update(myBooth._id, editForm)
      alert('摊位信息已保存')
      loadMyBooth()
    } catch (err) {
      alert(err.response?.data?.message || '保存失败')
    }
  }

  if (!expo) return <div className="text-center py-20">加载中...</div>

  if (myBooth) {
    const ownerId = myBooth.ownerId?._id || myBooth.ownerId
    const partnerId = myBooth.partnerId?._id || myBooth.partnerId
    const isOwner = String(ownerId) === String(user.id)
    const isPartner = partnerId && String(partnerId) === String(user.id)
    const canEdit = isOwner || isPartner

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">我的摊位</h2>
          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-700">摊位名称：</label>
              <p className="text-gray-800">{myBooth.name}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">摊主：</label>
              <span className="text-gray-800">{myBooth.ownerId?.username}</span>
              {myBooth.partnerId && (
                <span className="text-gray-800"> 🤝 合摊伙伴：{myBooth.partnerId.username}</span>
              )}
            </div>
            <div>
              <label className="font-medium text-gray-700">状态：</label>
              <span className={`ml-2 px-3 py-1 rounded text-sm ${
                myBooth.status === 'approved' ? 'bg-green-100 text-green-700' :
                myBooth.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {myBooth.status === 'approved' ? '已通过' :
                 myBooth.status === 'rejected' ? '已拒绝' : '审核中'}
              </span>
            </div>
          </div>
        </div>

        {myBooth.status === 'approved' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🤝 合摊伙伴</h3>

            {myBooth.partnerId ? (
              <p className="text-gray-700">
                {isOwner
                  ? `${myBooth.partnerId.username} 已接受邀请，正与你共同管理该摊位。`
                  : `你正在与摊主 ${myBooth.ownerId?.username} 共同管理该摊位。`}
              </p>
            ) : myBooth.partnerInvite?.inviteeId ? (
              <div>
                <p className="text-gray-700">
                  已邀请 <span className="font-medium">{myBooth.partnerInvite.inviteeId.username}</span>
                  （{myBooth.partnerInvite.email}），等待对方在展会页确认。
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  邀请时间：{new Date(myBooth.partnerInvite.invitedAt).toLocaleString()}
                </p>
                {isOwner && (
                  <button
                    onClick={withdrawInvite}
                    className="mt-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    撤回邀请
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <form onSubmit={sendInvite} className="space-y-3">
                <p className="text-gray-600 text-sm">输入已注册伙伴的邮箱，向对方发出合摊邀请。</p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="伙伴的注册邮箱"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                  >
                    发送邀请
                  </button>
                </div>
              </form>
            ) : null}

            {inviteMsg && (
              <p className={`mt-3 text-sm ${inviteMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {inviteMsg.text}
              </p>
            )}
          </div>
        )}

        {canEdit && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">维护摊位信息</h3>
            <form onSubmit={saveBooth} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">摊位介绍</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-medium">商品清单</label>
                <textarea
                  value={editForm.products}
                  onChange={e => setEditForm({ ...editForm, products: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-medium">位置偏好</label>
                <textarea
                  value={editForm.positionPreference}
                  onChange={e => setEditForm({ ...editForm, positionPreference: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold hover:opacity-90"
              >
                保存修改
              </button>
            </form>
          </div>
        )}

        <Link to={`/expo/${id}`} className="block text-center text-purple-600 hover:underline">
          返回展会
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">申请摊位 - {expo.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">摊位名称</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-medium">摊位描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-medium">售卖商品类型</label>
            <textarea
              value={form.products}
              onChange={e => setForm({ ...form, products: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-medium">期望分区</label>
            <select
              value={form.zoneName}
              onChange={e => setForm({ ...form, zoneName: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">请选择分区</option>
              {expo.zones?.map(zone => (
                <option key={zone._id} value={zone.name}>{zone.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-medium">位置偏好说明</label>
            <textarea
              value={form.positionPreference}
              onChange={e => setForm({ ...form, positionPreference: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 rounded-lg font-semibold hover:opacity-90"
          >
            提交申请
          </button>
        </form>
      </div>
    </div>
  )
}
