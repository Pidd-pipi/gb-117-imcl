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

  if (!expo) return <div className="text-center py-20">加载中...</div>

  if (myBooth) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">我的摊位申请</h2>
          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-700">摊位名称：</label>
              <p className="text-gray-800">{myBooth.name}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">描述：</label>
              <p className="text-gray-800">{myBooth.description}</p>
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
          <Link to={`/expo/${id}`} className="block mt-6 text-center text-purple-600 hover:underline">
            返回展会
          </Link>
        </div>
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
