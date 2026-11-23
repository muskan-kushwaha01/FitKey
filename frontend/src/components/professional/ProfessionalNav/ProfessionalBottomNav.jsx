import { NavLink } from 'react-router-dom'
import { Home, Stethoscope, Trophy, Zap, UserRound } from 'lucide-react'

export const professionalNavigation = [
  { name: 'Home', path: '/professional/home', icon: Home },
  { name: 'Consult', path: '/professional/consultations', icon: Stethoscope },
  { name: 'Rank', path: '/professional/leaderboard', icon: Trophy },
  { name: 'XP', path: '/professional/xp', icon: Zap },
  { name: 'Profile', path: '/professional/profile', icon: UserRound },
]

export function ProfessionalBottomNav() {
  return (
    <nav className="grid grid-cols-5 items-center">
      {professionalNavigation.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${
                isActive ? 'text-[#033135] font-bold' : 'text-[#647572]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-10 items-center justify-center rounded-xl transition-all ${
                    isActive ? 'bg-[#E4F0EA] text-[#033135]' : 'text-[#647572]'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className="whitespace-nowrap">{item.name}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default ProfessionalBottomNav
