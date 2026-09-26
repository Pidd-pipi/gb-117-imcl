import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { boothAPI, favoriteAPI, reviewAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function BoothDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [booth, setBooth] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBooth()
    loadReviews()
    if (user) {
      checkFavorite()
    }
  }, [id, user])

  const loadBooth = async () => {
    try {
      const res = await boothAPI.getById(id)
      setBooth(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      const res = await reviewAPI.getByBooth(id)
      setReviews(res.data.reviews)
      setAvgRating(res.data.avgRating)
    } catch (err) {
      console.error(err)
    }
  }

  const checkFavorite = async () => {
    try {
      const res = await favoriteAPI.getExpoFavorites(booth?.expoId || '')
      setIsFavorite(res.data.includes(id))
    } catch (err) {
      console.error(err)
    }
  }

  const toggleFavorite = async () => {
    if (!user) {
      alert('请先登录')
      return
    }
    try {
      if (isFavorite) {
        await favoriteAPI.removeFavorite(id)
        setIsFavorite(false)
      } else {
        await favoriteAPI.addFavorite({ boothId: id, expoId: booth.expoId })
        setIsFavorite(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('请先登录')
      return
    }
    try {
      await reviewAPI.create({ ...newReview, boothId: id, expoId: booth.expoId })
      loadReviews()
      setNewReview({ rating: 5, comment: '' })
      alert('评价成功')
    } catch (err) {
      alert('您已评价过该摊位')
    }
  }

  if (loading) {
    return <div className="text-center py-20">加载中...</div>
  }

  if (!booth) {
    return <div className="text-center py-20">摊位不存在</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={`/expo/${booth.expoId}`} className="text-purple-600 hover:underline mb-4 inline-block">
        ← 返回展会
      </Link>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{booth.name}</h1>
              {booth.zoneName && (
                <span className="inline-block mt-2 bg-white/20 px-3 py-1 rounded text-sm">
                  {booth.zoneName}
                </span>
              )}
            </div>
            <button
              onClick={toggleFavorite}
              className={`px-6 py-2 rounded-lg font-semibold ${
                isFavorite
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isFavorite ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
          </div>
        </div>

        <div className="p-8">
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">摊位介绍</h2>
            <p className="text-gray-600">{booth.description}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">售卖商品</h2>
            <p className="text-gray-600">{booth.products}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              评价 ({reviews.length}) - 平均评分: {avgRating.toFixed(1)}
            </h2>
            
            {user && (
              <form onSubmit={submitReview} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3">发表评价</h3>
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">评分</label>
                  <select
                    value={newReview.rating}
                    onChange={e => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                    className="px-3 py-2 border rounded"
                  >
                    {[5, 4, 3, 2, 1].map(n => (
                      <option key={n} value={n}>{n} 星</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">评论</label>
                  <textarea
                    value={newReview.comment}
                    onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  提交评价
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-gray-500">暂无评价</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review._id} className="border-b pb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      <span className="ml-2 font-medium text-gray-700">{review.userId?.username}</span>
                    </div>
                    {review.comment && <p className="text-gray-600">{review.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
