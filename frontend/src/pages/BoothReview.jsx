import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { boothAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function BoothReview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pendingBooths, setPendingBooths] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
      return
    }
    loadPendingBooths()
  }, [user])

  const loadPendingBooths = async () => {
    try {
      const res = await boothAPI.getPending()
      setPendingBooths(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const approveBooth = async (boothId) => {
    try {
      await boothAPI.approve(boothId, { zone: '默认区', position: { x: 100, y: 100 } })
      loadPendingBooths()
      alert('已通过')
    } catch (err) {
      alert('操作失败')
    }
  }

  const rejectBooth = async (boothId) => {
    try {
      await boothAPI.reject(boothId)
      loadPendingBooths()
      alert('已拒绝')
    } catch (err) {
      alert('操作失败')
    }
  }

  if (loading) {
    return <div className="text-center py-20">加载中...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">摊位审核</h1>
      
      {pendingBooths.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-gray-500">暂无待审核的摊位申请</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBooths.map(booth => (
            <div key={booth._id} className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{booth.name}</h3>
                  <p className="text-gray-600 mt-2">{booth.description}</p>
                  <div className="mt-3 text-sm text-gray-500 space-y-1">
                    <p><span className="font-medium">售卖商品：</span>{booth.products}</p>
                    <p><span className="font-medium">期望分区：</span>{booth.zoneName || '未选择'}</p>
                    <p><span className="font-medium">位置偏好：</span>{booth.positionPreference || '未填写'}</p>
                    <p><span className="font-medium">申请人：</span>{booth.ownerId?.username} ({booth.ownerId?.email})</p>
                  </div>
                </div>
                <div className="flex gap-3 ml-6">
                  <button
                    onClick={() => approveBooth(booth._id)}
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => rejectBooth(booth._id)}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
