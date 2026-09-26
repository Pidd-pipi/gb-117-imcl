import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold">🎌 虚拟漫展平台</Link>
            
            <div className="flex items-center gap-6">
              {user ? (
                <>
                  <Link to="/expo/create" className="hover:text-purple-200">创建展会</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin/booths" className="hover:text-purple-200">摊位审核</Link>
                  )}
                  <span className="text-purple-200">欢迎, {user.username}</span>
                  <button onClick={handleLogout} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30">
                    退出
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-purple-200">登录</Link>
                  <Link to="/register" className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30">
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
