import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { expoAPI } from '../api'

export default function Home() {
  const [expos, setExpos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExpos()
  }, [])

  const loadExpos = async () => {
    try {
      const res = await expoAPI.getAll()
      setExpos(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20">加载中...</div>
  }

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">🎌 欢迎来到虚拟漫展平台</h1>
        <p className="text-gray-600 text-lg">发现精彩漫展，参与摊位互动，获取最新活动资讯</p>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">即将举办的漫展</h2>
      
      {expos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500">暂无漫展，快来创建第一个吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expos.map(expo => (
            <Link key={expo._id} to={`/expo/${expo._id}`}>
              <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-6xl">🎪</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{expo.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{expo.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>📅</span>
                    <span className="ml-2">
                      {new Date(expo.startDate).toLocaleDateString()} - {new Date(expo.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
