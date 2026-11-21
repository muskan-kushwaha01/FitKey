
import { Routes, Route, Navigate } from 'react-router-dom'

import Splash from './pages/onboarding/Splash'
import Welcome from './pages/onboarding/Welcome'
import WellnessSetup from './pages/onboarding/WellnessSetup'

import Auth from './pages/auth/Auth'
import ForgotPassword from './pages/auth/ForgotPassword'

import MainLayout from './layouts/MainLayout'
import Home from './pages/home/Home'
import Health from './pages/health/Health'
import Rewards from './pages/rewards/Rewards'
import Community from './pages/community/Community'

import Profile from './pages/profile/Profile'
import Partnerships from './pages/profile/Partnerships'
import Settings from './pages/profile/Settings'
import JourneySelection from './pages/onboarding/JourneySelection'

function App() {
  return (
    <Routes>
      {/* Onboarding */}
      <Route path="/" element={<Splash />} />
      <Route path="/welcome" element={<Welcome />} />

      {/* Authentication */}
      <Route path="/login" element={<Auth initialMode="login" />} />
      <Route path="/signup" element={<Auth initialMode="signup" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/wellness-setup" element={<WellnessSetup />} />
      <Route
        path="/journey-selection"
        element={<JourneySelection />}
      />

      {/* Main Application */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/health" element={<Health />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/partnerships" element={<Partnerships />} />
        <Route path="/settings" element={<Settings />} />


      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
