
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Activity, Moon, Heart, Salad, Dumbbell, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const goals = [
    { id: 'fitness', label: 'Improve fitness', icon: Dumbbell },
    { id: 'sleep', label: 'Better sleep', icon: Moon },
    { id: 'nutrition', label: 'Healthy nutrition', icon: Salad },
    { id: 'stress', label: 'Manage stress', icon: Heart },
    { id: 'wellness', label: 'Overall wellness', icon: Sparkles },
]

const activityLevels = [
    { id: 'light', label: 'Light', description: 'Mostly sitting, little exercise' },
    { id: 'moderate', label: 'Moderate', description: 'Some activity during the week' },
    { id: 'active', label: 'Active', description: 'Regular exercise or sports' },
]

function WellnessSetup() {
    const navigate = useNavigate()

    const [age, setAge] = useState('')
    const [goal, setGoal] = useState('wellness')
    const [activity, setActivity] = useState('moderate')

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!age || Number(age) < 13 || Number(age) > 100) {
            toast.error('Please enter an age between 13 and 100')
            return
        }

        // We'll save this information to Supabase later.
        const wellnessProfile = {
            age: Number(age),
            goal,
            activity,
        }

        console.log('Wellness profile:', wellnessProfile)

        navigate('/home')
    }

    return (
        <div className="min-h-screen bg-[#F8FAF7] px-4 py-8 sm:py-12">

            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <button
                        onClick={() => navigate('/signup')}
                        className="flex items-center gap-2 text-sm text-[#647572] hover:text-[#033135]"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    <span className="text-sm font-semibold text-[#647572]">
                        Step 1 of 1
                    </span>
                </div>

                {/* Progress */}
                <div className="h-1.5 w-full bg-[#E4F0EA] rounded-full mb-10">
                    <div className="h-full w-full bg-[#033135] rounded-full" />
                </div>

                {/* Introduction */}
                <div className="mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[#DCD6F7] flex items-center justify-center mb-5">
                        <Activity size={27} className="text-[#033135]" />
                    </div>

                    <p className="text-sm font-semibold text-[#647572] mb-2">
                        LET'S PERSONALIZE YOUR EXPERIENCE
                    </p>

                    <h1 className="text-3xl sm:text-4xl font-bold text-[#033135]">
                        A little about you.
                    </h1>

                    <p className="text-[#647572] mt-3 leading-6">
                        Tell us a few things so FitKey can make your wellness journey
                        more relevant to you.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>

                    {/* Age */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EFEB] mb-5">
                        <label className="block font-semibold text-[#033135] mb-3">
                            How old are you?
                        </label>

                        <input
                            type="number"
                            min="13"
                            max="100"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="Enter your age"
                            className="w-full border border-[#DCE6E1] rounded-xl px-4 py-3 outline-none focus:border-[#033135] text-sm"
                        />
                    </div>

                    {/* Wellness Goal */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EFEB] mb-5">
                        <h2 className="font-semibold text-[#033135] mb-1">
                            What's your main wellness goal?
                        </h2>

                        <p className="text-xs text-[#647572] mb-4">
                            Choose what matters most to you right now.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {goals.map((item) => {
                                const Icon = item.icon
                                const selected = goal === item.id

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setGoal(item.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${selected
                                                ? 'border-[#033135] bg-[#E4F0EA]'
                                                : 'border-[#E8EFEB] hover:border-[#C4D7D4]'
                                            }`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                                            <Icon size={19} className="text-[#324C4D]" />
                                        </div>

                                        <span className="text-sm font-medium text-[#033135]">
                                            {item.label}
                                        </span>

                                        {selected && (
                                            <span className="ml-auto text-[#033135] font-bold">
                                                ✓
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Activity Level */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8EFEB] mb-7">
                        <h2 className="font-semibold text-[#033135] mb-1">
                            How active are you usually?
                        </h2>

                        <p className="text-xs text-[#647572] mb-4">
                            This helps us understand your current routine.
                        </p>

                        <div className="space-y-3">
                            {activityLevels.map((item) => {
                                const selected = activity === item.id

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setActivity(item.id)}
                                        className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border text-left transition ${selected
                                                ? 'border-[#033135] bg-[#E4F0EA]'
                                                : 'border-[#E8EFEB] hover:border-[#C4D7D4]'
                                            }`}
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-[#033135]">
                                                {item.label}
                                            </p>
                                            <p className="text-xs text-[#647572] mt-1">
                                                {item.description}
                                            </p>
                                        </div>

                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-[#033135]' : 'border-[#C4D7D4]'
                                            }`}>
                                            {selected && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#033135]" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-[#033135] text-white py-4 rounded-xl font-semibold hover:bg-[#324C4D] transition"
                    >
                        Continue to FitKey
                        <ArrowRight size={19} />
                    </button>

                    <p className="text-center text-xs text-[#647572] mt-4">
                        You can update these preferences anytime from your profile.
                    </p>

                </form>
            </div>
        </div>
    )
}

export default WellnessSetup
