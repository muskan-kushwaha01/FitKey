
import { Routes, Route, Navigate } from 'react-router-dom'

import Splash from './pages/onboarding/Splash'
import Welcome from './pages/onboarding/Welcome'
import WellnessSetup from './pages/onboarding/WellnessSetup'
import HealthHistory from './pages/onboarding/HealthHistory'
import AllDone from './pages/onboarding/AllDone'

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

import ProfessionalLogin from './pages/professional/ProfessionalLogin'
import ProfessionalRegister from './pages/professional/ProfessionalRegister'
import ProfessionalOnboarding from './pages/professional/ProfessionalOnboarding'
import ProfessionalLayout from './layouts/ProfessionalLayout'
import ProfessionalHome from './pages/professional/ProfessionalHome'
import ProfessionalLeaderboard from './pages/professional/ProfessionalLeaderboard'
import ProfessionalXP from './pages/professional/ProfessionalXP'
import ProfessionalRewards from './pages/professional/ProfessionalRewards'
import ProfessionalProfile from './pages/professional/ProfessionalProfile'
import CreateContent from './pages/professional/CreateContent'
import EditContent from './pages/professional/EditContent'
import PublicProfessionalProfile from './pages/professional/PublicProfessionalProfile'

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

      {/* Professional Public Flow */}
      <Route path="/professional/login" element={<ProfessionalLogin />} />
      <Route path="/professional/register" element={<ProfessionalRegister />} />
      <Route path="/professional/onboarding" element={<ProfessionalOnboarding />} />
      <Route path="/professional/public/:id" element={<PublicProfessionalProfile />} />

      {/* Professional App (Protected with Persistent Navigation) */}
      <Route element={<ProfessionalLayout />}>
        <Route path="/professional/home" element={<ProfessionalHome />} />
        <Route path="/professional/leaderboard" element={<ProfessionalLeaderboard />} />
        <Route path="/professional/xp" element={<ProfessionalXP />} />
        <Route path="/professional/rewards" element={<ProfessionalRewards />} />
        <Route path="/professional/profile" element={<ProfessionalProfile />} />
        <Route path="/professional/content/create" element={<CreateContent />} />
        <Route path="/professional/content/edit/:id" element={<EditContent />} />
      </Route>

      {/* Health Profile Setup Flow */}
      <Route path="/journey-selection" element={<JourneySelection />} />
      <Route path="/wellness-setup" element={<WellnessSetup />} />
      <Route path="/health-history" element={<HealthHistory />} />
      <Route path="/all-done" element={<AllDone />} />

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
