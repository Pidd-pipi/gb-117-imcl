import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { expoAPI, boothAPI } from '../api'

export default function ExpoMap() {
  const { id } = useParams()
  const [expo, setExpo] = useState(null)
  const [booths, setBooths] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="text-center py-20">加载中...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link to={`/expo/${id}`} className="text-purple-600 hover:underline">← 返回展会详情</Link>
        <h1 className="text-3xl font-bold text-gray-800 mt-2">展会地图</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="relative bg-gray-100 rounded-lg" style={{ minHeight: '500px' }}>
          {expo.zones?.map(zone => (
            <div
              key={zone._id}
              className="absolute rounded-lg p-4 border-2"
              style={{
                left: (zone.position?.x || 50) + 'px',
                top: (zone.position?.y || 50) + 'px',
                width: (zone.position?.width || 200) + 'px',
                height: (zone.position?.height || 150) + 'px',
                backgroundColor: zone.color + '30',
                borderColor: zone.color
              }}
            >
              <h3 className="font-bold text-gray-800 mb-2">{zone.name}</h3>
              <div className="space-y-1">
                {booths.filter(b => b.zoneName === zone.name).map(booth => (
                  <Link key={booth._id} to={`/booth/${booth._id}`}>
                    <div className="text-xs bg-white rounded px-2 py-1 hover:bg-gray-50">
                      {booth.name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {booths.filter(b => !b.zoneName).map(booth => (
            <Link
              key={booth._id}
              to={`/booth/${booth._id}`}
              className="absolute bg-white rounded-lg shadow p-3 hover:shadow-md"
              style={{
                left: (booth.position?.x || Math.random() * 400 + 100) + 'px',
                top: (booth.position?.y || Math.random() * 300 + 100) + 'px'
              }}
            >
              <div className="text-sm font-medium text-gray-800">{booth.name}</div>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          {expo.zones?.map(zone => (
            <div key={zone._id} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color }} />
              <span className="text-sm text-gray-600">{zone.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
