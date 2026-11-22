import { ArrowRight, UserCheck, Stethoscope, Sparkles } from 'lucide-react'

export function ProfessionalEntrySelector({ onSelectUser, onSelectProfessional }) {
  return (
    <div className="w-full space-y-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* User Card Button */}
        <button
          type="button"
          onClick={onSelectUser}
          className="group relative flex flex-col items-start rounded-2xl border-2 border-[#033135] bg-[#033135] p-5 text-left text-white shadow-md transition-all hover:bg-[#324C4D] hover:shadow-lg active:scale-[0.99]"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
              <UserCheck size={20} />
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-[#F8E7A5]">
              Personal <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </span>
          </div>

          <h3 className="mt-4 text-base font-bold text-white sm:text-lg">
            Continue as a User
          </h3>
          <p className="mt-1 text-xs text-[#C4D7D4]">
            Track daily habits, earn rewards, and join our wellness community.
          </p>
        </button>

        {/* Professional Card Button */}
        <button
          type="button"
          onClick={onSelectProfessional}
          className="group relative flex flex-col items-start rounded-2xl border-2 border-[#C4D7D4] bg-white p-5 text-left shadow-sm transition-all hover:border-[#648C83] hover:bg-[#F8FAF7] hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135]">
              <Stethoscope size={20} />
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[11px] font-bold text-[#033135]">
              <Sparkles size={11} className="text-[#8B6D25]" /> PRO PORTAL
            </span>
          </div>

          <h3 className="mt-4 text-base font-bold text-[#033135] sm:text-lg">
            Continue as a Professional
          </h3>
          <p className="mt-1 text-xs text-[#647572]">
            For doctors, nutritionists, physiotherapists, & wellness coaches.
          </p>
        </button>
      </div>
    </div>
  )
}

export default ProfessionalEntrySelector
