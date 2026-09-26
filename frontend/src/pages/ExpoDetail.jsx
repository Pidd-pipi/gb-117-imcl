import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { expoAPI, boothAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function ExpoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expo, setExpo] = useState(null)
  const [booths, setBooths] = useState([])
  const [loading, setLoading] = useState(true)
  const [newZone, setNewZone] = useState({ name: '', color: '#6366f1' })

  useEffect(() => {
    loadExpo()
    loadBooths()
  }, [id])

  const loadExpo = async () => {
    try {
      const res = await expoAPI.getById(id)
      setExpo(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadBooths = async () => {
    try {
      const res = await boothAPI.getByExpo(id)
      setBooths(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const addZone = async () => {
    if (!newZone.name) return
    try {
      await expoAPI.addZone(id, newZone)
      setNewZone({ name: '', color: '#6366f1' })
      loadExpo()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="text-center py-20">加载中...</div>
  }

  if (!expo) {
    return <div className="text-center py-20">展会不存在</div>
  }

  const isOwner = user && expo.createdBy === user.id

  return (
    <div>
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-4xl font-bold mb-4">{expo.name}</h1>
        <p className="text-lg opacity-90 mb-4">{expo.description}</p>
        <div className="flex gap-6">
          <div className="flex items-center">
            <span className="text-2xl mr-2">📅</span>
            <span>{new Date(expo.startDate).toLocaleDateString()} - {new Date(expo.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <Link to={`/expo/${id}/map`} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700">
          🗺️ 查看展位地图
        </Link>
        <Link to={`/expo/${id}/schedule`} className="bg-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-600">
          📋 活动时间表
        </Link>
        {user && (
          <Link to={`/expo/${id}/apply`} className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600">
            🎪 申请摊位
          </Link>
        )}
      </div>

      {isOwner && (
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">管理分区</h3>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="分区名称"
              value={newZone.name}
              onChange={e => setNewZone({ ...newZone, name: e.target.value })}
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <input
              type="color"
              value={newZone.color}
              onChange={e => setNewZone({ ...newZone, color: e.target.value })}
              className="w-16 h-10 rounded cursor-pointer"
            />
            <button onClick={addZone} className="bg-purple-600 text-white px-6 py-2 rounded-lg">
              添加分区
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {expo.zones?.map(zone => (
              <div key={zone._id} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: zone.color }}>
                {zone.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">已入驻摊位 ({booths.length})</h3>
        {booths.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无摊位</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {booths.map(booth => (
              <Link key={booth._id} to={`/booth/${booth._id}`}>
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-gray-800">{booth.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{booth.description}</p>
                  {booth.zoneName && (
                    <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {booth.zoneName}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
