import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { expoAPI, boothAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

const STATUS_TEXT = {
  pending: '等待回复',
  accepted: '已接受',
  declined: '已拒绝',
  cancelled: '已撤回'
}

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-gray-200 text-gray-600',
  cancelled: 'bg-red-100 text-red-600'
}

export default function BoothApplication() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expo, setExpo] = useState(null)
  const [myBooth, setMyBooth] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    products: '',
    zoneName: '',
    positionPreference: ''
  })
  const [editForm, setEditForm] = useState({ description: '', products: '', positionPreference: '' })
  const [inviteEmail, setInviteEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)

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
      alert(err.response?.data?.message || '提交失败')
    }
  }

  const handleSaveBooth = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await boothAPI.update(myBooth._id, editForm)
      alert('摊位信息已保存')
      loadMyBooth()
    } catch (err) {
      alert(err.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await boothAPI.invite(myBooth._id, inviteEmail.trim())
      setInviteEmail('')
      alert('邀请已发送，等待伙伴在展会页接受')
      loadMyBooth()
    } catch (err) {
      alert(err.response?.data?.message || '邀请失败')
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvitation = async () => {
    if (!window.confirm('确定撤回该合摊邀请吗？')) return
    try {
      await boothAPI.cancelInvitation(myBooth._id)
      alert('邀请已撤回')
      loadMyBooth()
    } catch (err) {
      alert(err.response?.data?.message || '撤回失败')
    }
  }

  if (!expo) return <div className="text-center py-20">加载中...</div>

  if (myBooth) {
    const isOwner = myBooth.ownerId?._id === user.id
    const isPartner = myBooth.partnerId?._id === user.id
    const partnerName = myBooth.partnerId?.username
    const ownerName = myBooth.ownerId?.username

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">我的摊位</h2>
            <span className={`px-3 py-1 rounded text-sm ${
              myBooth.status === 'approved' ? 'bg-green-100 text-green-700' :
              myBooth.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {myBooth.status === 'approved' ? '已通过' :
               myBooth.status === 'rejected' ? '已拒绝' : '审核中'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-700">摊位名称：</label>
              <p className="text-gray-800">{myBooth.name}</p>
            </div>
            {myBooth.status !== 'approved' && (
              <div>
                <label className="font-medium text-gray-700">描述：</label>
                <p className="text-gray-800">{myBooth.description}</p>
              </div>
            )}

            {myBooth.status === 'approved' && (
              <div className="border-t pt-4">
                <h3 className="font-bold text-gray-800 mb-3">
                  👥 摊位成员
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    （你是{isOwner ? '摊主' : '合摊伙伴'}）
                  </span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg">
                    摊主：{ownerName}
                  </span>
                  {partnerName ? (
                    <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg">
                      合摊伙伴：{partnerName}
                    </span>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">
                      合摊伙伴：暂未加入
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 摊主邀请合摊伙伴并查看进展（仅已通过摊位） */}
        {myBooth.status === 'approved' && isOwner && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-2">🤝 邀请合摊伙伴</h3>
            <p className="text-sm text-gray-500 mb-4">
              输入伙伴的注册邮箱发出邀请，对方在展会页接受后即可共同维护摊位。每个摊位最多一位合摊伙伴。
            </p>

            {!partnerName ? (
              <form onSubmit={handleInvite} className="flex gap-3 mb-6">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="伙伴的注册邮箱"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button
                  type="submit"
                  disabled={inviting}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {inviting ? '发送中...' : '发送邀请'}
                </button>
              </form>
            ) : (
              <p className="mb-6 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
                合摊关系已建立：{partnerName} 已加入，双方均可维护摊位信息。
              </p>
            )}

            {myBooth.invitations?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">邀请进展</h4>
                <div className="space-y-2">
                  {myBooth.invitations.slice().reverse().map(inv => (
                    <div key={inv._id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div>
                        <p className="text-gray-800">
                          {inv.inviteeId?.username || '—'}
                          <span className="ml-2 text-sm text-gray-500">{inv.email}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(inv.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded text-sm ${STATUS_STYLE[inv.status]}`}>
                          {STATUS_TEXT[inv.status]}
                        </span>
                        {inv.status === 'pending' && (
                          <button
                            onClick={handleCancelInvitation}
                            className="text-sm text-red-500 hover:underline"
                          >
                            撤回
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 双方共同维护摊位介绍、商品清单和位置偏好（仅已通过摊位） */}
        {myBooth.status === 'approved' && (isOwner || isPartner) && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">🛠️ 维护摊位信息</h3>
            <form onSubmit={handleSaveBooth} className="space-y-6">
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
                <label className="block text-gray-700 mb-2 font-medium">售卖商品清单</label>
                <textarea
                  value={editForm.products}
                  onChange={e => setEditForm({ ...editForm, products: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2 font-medium">位置偏好说明</label>
                <textarea
                  value={editForm.positionPreference}
                  onChange={e => setEditForm({ ...editForm, positionPreference: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存摊位信息'}
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
