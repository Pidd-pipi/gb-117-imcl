import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ExpoDetail from './pages/ExpoDetail'
import CreateExpo from './pages/CreateExpo'
import ExpoMap from './pages/ExpoMap'
import BoothDetail from './pages/BoothDetail'
import BoothApplication from './pages/BoothApplication'
import BoothReview from './pages/BoothReview'
import SchedulePage from './pages/SchedulePage'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/expo/create" element={<CreateExpo />} />
          <Route path="/expo/:id" element={<ExpoDetail />} />
          <Route path="/expo/:id/map" element={<ExpoMap />} />
          <Route path="/expo/:id/schedule" element={<SchedulePage />} />
          <Route path="/expo/:id/apply" element={<BoothApplication />} />
          <Route path="/booth/:id" element={<BoothDetail />} />
          <Route path="/admin/booths" element={<BoothReview />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App
