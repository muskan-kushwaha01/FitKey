import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, redirectTo = '/login', type = 'user' }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAF7]">
        <p className="text-[#648C83]">Loading FitKey...</p>
      </div>
    )
  }

  if (!user) {
    const target = type === 'professional' ? '/professional/login' : redirectTo
    return <Navigate to={target} replace />
  }

  return children
}

export default ProtectedRoute
