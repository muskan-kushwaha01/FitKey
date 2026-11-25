import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    ArrowRight, ArrowLeft, Plus, Trash2, Check, ChevronDown,
    Upload, AlertTriangle, Zap, Utensils, Activity, Droplet,
    Pill, Stethoscope, Dumbbell, Moon, Coffee, Wind, Heart
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const TOTAL_STEPS = 6

/* ══════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
══════════════════════════════════════════════════════════ */

function ProgressBar({ step }) {
    return (
        <div className="mb-10 h-1.5 w-full rounded-full bg-[#E4F0EA]">
            <div
                className="relative h-full rounded-full bg-[#033135] transition-all duration-500"
                style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            >
                <span className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#E0AE3A] ring-4 ring-[#F8FAF7]" />
            </div>
        </div>
    )
}

function StepHeader({ step, onBack }) {
    return (
        <div className="mb-5 flex items-center justify-between">
            <button type="button" onClick={onBack}
                className="flex items-center gap-2 text-sm text-[#647572] transition hover:text-[#033135]">
                <ArrowLeft size={18} /> Back
            </button>
            <span className="text-xs font-semibold tracking-[0.18em] text-[#647572]">
                STEP {step + 2} OF {TOTAL_STEPS + 1}
            </span>
        </div>
    )
}

function Card({ children, delay = 0, className = '' }) {
    return (
        <div className={`fk-up rounded-3xl border border-[#E8EFEB] bg-white p-5 sm:p-6 ${className}`}
            style={{ animationDelay: `${delay}s` }}>
            {children}
        </div>
    )
}

function SectionLabel({ icon: Icon, iconBg, label, sub }) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon size={16} className="text-[#033135]" />
            </div>
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">{label}</p>
                {sub && <p className="text-xs text-[#647572]">{sub}</p>}
            </div>
        </div>
    )
}

function OptionChip({ label, selected, onClick, multi = false }) {
    return (
        <button type="button" onClick={onClick}
            className={`flex items-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-xs font-semibold transition-all ${selected
                ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                : 'border-[#E8EFEB] bg-white text-[#647572] hover:border-[#C4D7D4]'
                }`}>
            {multi && selected && <Check size={12} strokeWidth={3} />}
            {label}
        </button>
    )
}

function RadioRow({ label, selected, onClick }) {
    return (
        <button type="button" onClick={onClick}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${selected
                ? 'border-[#033135] bg-[#E4F0EA]'
                : 'border-[#E8EFEB] bg-white hover:border-[#C4D7D4]'
                }`}>
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${selected ? 'border-[#033135] bg-[#033135]' : 'border-[#C4D7D4]'}`}>
                {selected && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
            <span className="text-sm font-medium text-[#033135]">{label}</span>
        </button>
    )
}

function TextInput({ placeholder, value, onChange, label }) {
    return (
        <div className="space-y-1">
            {label && <p className="text-xs font-semibold text-[#647572]">{label}</p>}
            <input type="text" value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-[#DCE6E1] bg-[#F8FAF7] px-4 py-3 text-sm text-[#033135] outline-none transition placeholder:text-[#C4D7D4] focus:border-[#033135] focus:bg-white" />
        </div>
    )
}

function SelectBox({ options, value, onChange, placeholder }) {
    return (
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#DCE6E1] bg-[#F8FAF7] px-4 py-3 text-sm font-medium text-[#033135] outline-none transition focus:border-[#033135] focus:bg-white">
                <option value="">{placeholder || 'Select…'}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#647572]" />
        </div>
    )
}

function SliderInput({ value, onChange, min, max, unit, label, step = 1, decimals = 0 }) {
    const pct = ((value - min) / (max - min)) * 100
    const display = decimals > 0 ? value.toFixed(decimals) : value
    return (
        <div className="space-y-3">
            {label && <p className="text-xs font-semibold text-[#647572]">{label}</p>}
            <div className="flex items-end justify-center gap-2">
                <span className="text-4xl font-bold text-[#033135]" style={{ fontFamily: SERIF }}>{display}</span>
                <span className="mb-1 text-sm text-[#647572]">{unit}</span>
            </div>
            <div className="relative h-10 overflow-hidden rounded-2xl bg-[#E4F0EA]">
                <div className="absolute h-full rounded-2xl bg-gradient-to-r from-[#033135] to-[#324C4D] transition-all duration-200" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-1.5 rounded-full bg-[#E0AE3A] shadow transition-all duration-200" style={{ left: `${pct}%` }} />
                <input type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </div>
            <div className="flex justify-between text-xs text-[#647572]">
                <span>{min} {unit}</span><span>{max} {unit}</span>
            </div>
        </div>
    )
}

function NavButtons({ onNext, nextLabel = 'Continue', onSkip, isLoading = false }) {
    return (
        <div className="pb-8 pt-3 space-y-3">
            <button type="button" onClick={onNext}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#033135] py-4 font-semibold text-white transition hover:bg-[#324C4D] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed">
                {isLoading ? (
                    <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Saving health profile...</span>
                    </>
                ) : (
                    <>
                        {nextLabel} <ArrowRight size={19} />
                    </>
                )}
            </button>
            {onSkip && !isLoading && (
                <button type="button" onClick={onSkip}
                    className="w-full rounded-2xl border border-[#E8EFEB] py-3 text-sm font-medium text-[#647572] transition hover:border-[#C4D7D4] hover:text-[#033135]">
                    Skip for now
                </button>
            )}
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   STEP 1 — Medical Conditions
══════════════════════════════════════════════════════════ */
const CONDITIONS = [
    'Diabetes (Type 1)', 'Diabetes (Type 2)', 'High blood pressure', 'Low blood pressure',
    'Heart-related conditions', 'Asthma', 'Thyroid disorders', 'PCOS / PCOD',
    'Obesity', 'Anaemia', 'Arthritis / Joint disorders', 'Kidney-related conditions',
    'Liver-related conditions', 'Neurological disorders', 'Other', 'None',
]

function Step1MedicalConditions({ data, setData, onNext, onBack }) {
    const toggle = (c) => {
        if (c === 'None') {
            setData(d => ({ ...d, conditions: d.conditions.includes('None') ? [] : ['None'] }))
            return
        }
        setData(d => {
            const without = d.conditions.filter(x => x !== 'None' && x !== c)
            return { ...d, conditions: d.conditions.includes(c) ? without : [...without, c] }
        })
    }

    const updateDetail = (idx, field, val) => {
        setData(d => {
            const details = [...(d.conditionDetails || [])]
            details[idx] = { ...(details[idx] || {}), [field]: val }
            return { ...d, conditionDetails: details }
        })
    }

    const hasNone = data.conditions.includes('None')
    const hasConditions = data.conditions.length > 0 && !hasNone

            const handleSkip = () => {
                const skipped = { conditions: ['None'], conditionDetails: [] }
                setData(skipped)
                onNext(skipped)
            }

            return (
                <div className="space-y-5">
                    <div className="fk-up mb-2">
                        <p className="mb-1 text-[11px] font-bold tracking-[0.18em] text-[#647572]">MEDICAL CONDITIONS</p>
                        <h2 className="text-3xl leading-tight text-[#033135] sm:text-4xl" style={{ fontFamily: SERIF }}>
                            Any diagnosed conditions?
                            <span className="ml-1 inline-block h-[0.12em] w-[0.12em] rounded-full bg-[#E0AE3A] align-baseline" />
                        </h2>
                        <p className="mt-2 text-sm text-[#647572]">Select all that apply.</p>
                    </div>

                    <Card>
                        <div className="flex flex-wrap gap-2">
                            {CONDITIONS.map(c => (
                                <OptionChip key={c} label={c} selected={data.conditions.includes(c)} onClick={() => toggle(c)} multi />
                            ))}
                        </div>
                    </Card>

                    {/* Condition detail forms */}
                    {hasConditions && data.conditions.map((cond, idx) => (
                        <Card key={cond} delay={0.05 * idx}
                            className="border-[#DCD6F7] bg-gradient-to-br from-white to-[#DCD6F7]/20">
                            <p className="mb-3 font-semibold text-[#033135]">{cond}</p>
                            <div className="space-y-3">
                                <TextInput label="When were you diagnosed? (optional)"
                                    placeholder="e.g. 2018 or January 2020"
                                    value={(data.conditionDetails?.[idx]?.year) || ''}
                                    onChange={v => updateDetail(idx, 'year', v)} />
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-[#647572]">Currently under control?</p>
                                    <div className="flex gap-2">
                                        {['Yes', 'No', 'Not sure'].map(opt => (
                                            <button key={opt} type="button"
                                                onClick={() => updateDetail(idx, 'controlled', opt)}
                                                className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${(data.conditionDetails?.[idx]?.controlled) === opt
                                                    ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                                    : 'border-[#E8EFEB] text-[#647572] hover:border-[#C4D7D4]'
                                                    }`}>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}

                    <NavButtons onNext={() => onNext()} onSkip={handleSkip} />
                </div>
            )
}

/* ══════════════════════════════════════════════════════════
   STEP 2 — Medications & Treatment
══════════════════════════════════════════════════════════ */
const TREATMENT_TYPES = ['Medication', 'Physiotherapy', 'Hormonal treatment', 'Post-surgery recovery', 'Other']
const SUPPLEMENTS = ['Protein', 'Vitamins / Minerals', 'Creatine', 'Other', 'None']
const UPLOAD_TYPES = ['Blood test reports', 'Prescriptions', 'Diagnosis reports', 'Other medical documents']

function MedCard({ children, title, icon: Icon, iconBg = 'bg-[#E4F0EA]', delay = 0 }) {
    return (
        <Card delay={delay}>
            {Icon && <SectionLabel icon={Icon} iconBg={iconBg} label={title} />}
            {!Icon && <p className="mb-3 text-sm font-semibold text-[#033135]">{title}</p>}
            {children}
        </Card>
    )
}

function Step2Medications({ data, setData, onNext }) {
    const set = (field, val) => setData(d => ({ ...d, [field]: val }))
    const addMed = () => setData(d => ({ ...d, medications: [...(d.medications || []), { name: '', dosage: '', frequency: '', reason: '' }] }))
    const updateMed = (i, f, v) => setData(d => { const m = [...(d.medications || [])]; m[i] = { ...m[i], [f]: v }; return { ...d, medications: m } })
    const removeMed = (i) => setData(d => { const m = [...(d.medications || [])]; m.splice(i, 1); return { ...d, medications: m } })
    const toggleSup = (s) => setData(d => {
        if (s === 'None') return { ...d, supplements: d.supplements?.includes('None') ? [] : ['None'] }
        const without = (d.supplements || []).filter(x => x !== 'None' && x !== s)
        return { ...d, supplements: d.supplements?.includes(s) ? without : [...without, s] }
    })

    return (
        <div className="space-y-5">
            <div className="fk-up mb-2">
                <p className="mb-1 text-[11px] font-bold tracking-[0.18em] text-[#647572]">MEDICATIONS & TREATMENT</p>
                <h2 className="text-3xl leading-tight text-[#033135] sm:text-4xl" style={{ fontFamily: SERIF }}>
                    Current medications?
                    <span className="ml-1 inline-block h-[0.12em] w-[0.12em] rounded-full bg-[#E0AE3A] align-baseline" />
                </h2>
            </div>

            {/* Q1 Medications */}
            <MedCard icon={Pill} iconBg="bg-[#DCD6F7]" title="Are you taking any medication?" delay={0.05}>
                <div className="space-y-2 mb-4">
                    {['Yes', 'No'].map(opt => (
                        <RadioRow key={opt} label={opt} selected={data.takingMeds === opt} onClick={() => set('takingMeds', opt)} />
                    ))}
                </div>
                {data.takingMeds === 'Yes' && (
                    <div className="space-y-4 mt-4">
                        {(data.medications || []).map((med, i) => (
                            <div key={i} className="rounded-2xl bg-[#F8FAF7] p-4 space-y-3 border border-[#E8EFEB]">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-[#647572] uppercase tracking-wider">Medication {i + 1}</p>
                                    <button type="button" onClick={() => removeMed(i)} className="text-[#C4D7D4] hover:text-red-400 transition">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                                <TextInput label="Medication name" placeholder="e.g. Metformin" value={med.name} onChange={v => updateMed(i, 'name', v)} />
                                <div className="grid grid-cols-2 gap-3">
                                    <TextInput label="Dosage" placeholder="e.g. 500mg" value={med.dosage} onChange={v => updateMed(i, 'dosage', v)} />
                                    <TextInput label="Frequency" placeholder="e.g. Twice daily" value={med.frequency} onChange={v => updateMed(i, 'frequency', v)} />
                                </div>
                                <TextInput label="Reason" placeholder="e.g. Blood sugar control" value={med.reason} onChange={v => updateMed(i, 'reason', v)} />
                            </div>
                        ))}
                        <button type="button" onClick={addMed}
                            className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-[#C4D7D4] px-4 py-3 text-xs font-semibold text-[#647572] transition hover:border-[#033135] hover:text-[#033135] w-full justify-center">
                            <Plus size={15} /> Add medication
                        </button>
                    </div>
                )}
            </MedCard>

            {/* Q2 Treatment */}
            <MedCard icon={Stethoscope} iconBg="bg-[#FFD9C7]" title="Undergoing any treatment or therapy?" delay={0.1}>
                <div className="space-y-2 mb-4">
                    {['Yes', 'No'].map(opt => (
                        <RadioRow key={opt} label={opt} selected={data.inTreatment === opt} onClick={() => set('inTreatment', opt)} />
                    ))}
                </div>
                {data.inTreatment === 'Yes' && (
                    <div className="mt-4 space-y-3">
                        <TextInput label="Condition being treated" placeholder="e.g. Knee recovery" value={data.treatmentCondition || ''} onChange={v => set('treatmentCondition', v)} />
                        <div>
                            <p className="mb-2 text-xs font-semibold text-[#647572]">Type of treatment</p>
                            <div className="flex flex-wrap gap-2">
                                {TREATMENT_TYPES.map(t => (
                                    <OptionChip key={t} label={t} selected={data.treatmentType === t} onClick={() => set('treatmentType', t)} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold text-[#647572]">Exercise or dietary restrictions advised?</p>
                            <div className="flex gap-2">
                                {['Yes', 'No', 'Not sure'].map(opt => (
                                    <button key={opt} type="button" onClick={() => set('treatmentRestrictions', opt)}
                                        className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${data.treatmentRestrictions === opt ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]' : 'border-[#E8EFEB] text-[#647572]'}`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </MedCard>

            {/* Q3 Supplements */}
            <MedCard icon={Zap} iconBg="bg-[#F8E7A5]" title="Taking any supplements?" delay={0.15}>
                <div className="flex flex-wrap gap-2">
                    {SUPPLEMENTS.map(s => (
                        <OptionChip key={s} label={s} selected={(data.supplements || []).includes(s)} onClick={() => toggleSup(s)} multi />
                    ))}
                </div>
            </MedCard>

            {/* Q4 Upload */}
            <MedCard icon={Upload} iconBg="bg-[#C4D7D4]" title="Upload medical reports? (optional)" delay={0.2}>
                <div className="flex flex-wrap gap-2 mb-4">
                    {UPLOAD_TYPES.map(u => (
                        <OptionChip key={u} label={u} selected={(data.uploadTypes || []).includes(u)}
                            onClick={() => setData(d => {
                                const list = d.uploadTypes || []
                                return { ...d, uploadTypes: list.includes(u) ? list.filter(x => x !== u) : [...list, u] }
                            })} multi />
                    ))}
                </div>
                {(data.uploadTypes || []).length > 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-[#C4D7D4] p-6 text-center">
                        <Upload size={22} className="mx-auto mb-2 text-[#647572]" />
                        <p className="text-xs text-[#647572]">File upload will be available soon</p>
                        <p className="text-[11px] text-[#C4D7D4] mt-1">Backend integration coming later</p>
                    </div>
                )}
            </MedCard>

            <NavButtons onNext={() => onNext()} onSkip={() => {
                const skipped = { ...data, takingMeds: data.takingMeds || 'No', inTreatment: data.inTreatment || 'No' }
                setData(skipped)
                onNext(skipped)
            }} />
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   STEP 3 — Allergies
══════════════════════════════════════════════════════════ */
const ALLERGY_TYPES = ['Medication allergies', 'Food allergies', 'Dust / Pollen', 'Latex', 'Other', 'No known allergies']
const SEVERITY = ['Mild', 'Moderate', 'Severe', 'Not sure']

function Step3Allergies({ data, setData, onNext }) {
    const toggleAllergy = (a) => {
        if (a === 'No known allergies') {
            setData(d => ({ ...d, allergies: d.allergies?.includes(a) ? [] : [a] }))
            return
        }
        setData(d => {
            const without = (d.allergies || []).filter(x => x !== 'No known allergies' && x !== a)
            return { ...d, allergies: d.allergies?.includes(a) ? without : [...without, a] }
        })
    }
    const updateDetail = (idx, f, v) => setData(d => {
        const details = [...(d.allergyDetails || [])]
        details[idx] = { ...(details[idx] || {}), [f]: v }
        return { ...d, allergyDetails: details }
    })

    const hasAllergies = (data.allergies || []).length > 0 && !data.allergies.includes('No known allergies')

    return (
        <div className="space-y-5">
            <div className="fk-up mb-2">
                <p className="mb-1 text-[11px] font-bold tracking-[0.18em] text-[#647572]">ALLERGIES</p>
                <h2 className="text-3xl leading-tight text-[#033135] sm:text-4xl" style={{ fontFamily: SERIF }}>
                    Known allergies?
                    <span className="ml-1 inline-block h-[0.12em] w-[0.12em] rounded-full bg-[#E0AE3A] align-baseline" />
                </h2>
                <p className="mt-2 text-sm text-[#647572]">Select all that apply.</p>
            </div>

            <Card>
                <div className="flex flex-wrap gap-2">
                    {ALLERGY_TYPES.map(a => (
                        <OptionChip key={a} label={a} selected={(data.allergies || []).includes(a)} onClick={() => toggleAllergy(a)} multi />
                    ))}
                </div>
            </Card>

            {hasAllergies && data.allergies.map((allergy, idx) => (
                <Card key={allergy} delay={0.05 * idx} className="border-[#FFD9C7] bg-gradient-to-br from-white to-[#FFD9C7]/20">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={15} className="text-orange-400" />
                        <p className="font-semibold text-sm text-[#033135]">{allergy}</p>
                    </div>
                    <div className="space-y-3">
                        <TextInput label="Specify allergen" placeholder="e.g. Penicillin, Peanuts, Dust mites" value={data.allergyDetails?.[idx]?.allergen || ''} onChange={v => updateDetail(idx, 'allergen', v)} />
                        <TextInput label="Symptoms / reaction" placeholder="e.g. Rash, difficulty breathing" value={data.allergyDetails?.[idx]?.reaction || ''} onChange={v => updateDetail(idx, 'reaction', v)} />
                        <div>
                            <p className="mb-2 text-xs font-semibold text-[#647572]">Severity</p>
                            <div className="flex flex-wrap gap-2">
                                {SEVERITY.map(s => (
                                    <button key={s} type="button" onClick={() => updateDetail(idx, 'severity', s)}
                                        className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${data.allergyDetails?.[idx]?.severity === s
                                            ? s === 'Severe' ? 'border-red-400 bg-red-50 text-red-600'
                                                : s === 'Moderate' ? 'border-orange-400 bg-orange-50 text-orange-600'
                                                    : 'border-[#033135] bg-[#E4F0EA] text-[#033135]'
                                            : 'border-[#E8EFEB] text-[#647572]'
                                            }`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            ))}

            <NavButtons onNext={() => onNext()} onSkip={() => {
                const skipped = { allergies: ['No known allergies'], allergyDetails: [] }
                setData(skipped)
                onNext(skipped)
            }} />
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   STEP 4 — Injuries & Physical Limitations
══════════════════════════════════════════════════════════ */
const INJURY_TYPES = [
    'Muscle injury', 'Joint pain', 'Back pain', 'Neck pain', 'Knee injury',
    'Shoulder injury', 'Ankle injury', 'Wrist injury', 'Mobility limitations', 'Other', 'None'
]

function Step4Injuries({ data, setData, onNext }) {
    const toggleInjury = (i) => {
        if (i === 'None') { setData(d => ({ ...d, injuries: ['None'] })); return }
        setData(d => {
            const without = (d.injuries || []).filter(x => x !== 'None' && x !== i)
            return { ...d, injuries: d.injuries?.includes(i) ? without : [...without, i] }
        })
    }
    const updateDetail = (idx, f, v) => setData(d => {
        const details = [...(d.injuryDetails || [])]
        details[idx] = { ...(details[idx] || {}), [f]: v }
        return { ...d, injuryDetails: details }
    })

    const hasInjuries = (data.injuries || []).length > 0 && !data.injuries.includes('None')

    return (
        <div className="space-y-5">
            <div className="fk-up mb-2">
                <p className="mb-1 text-[11px] font-bold tracking-[0.18em] text-[#647572]">INJURIES & LIMITATIONS</p>
                <h2 className="text-3xl leading-tight text-[#033135] sm:text-4xl" style={{ fontFamily: SERIF }}>
                    Any injuries or pain?
                    <span className="ml-1 inline-block h-[0.12em] w-[0.12em] rounded-full bg-[#E0AE3A] align-baseline" />
                </h2>
                <p className="mt-2 text-sm text-[#647572]">Select all that apply.</p>
            </div>

            <Card>
                <div className="flex flex-wrap gap-2">
                    {INJURY_TYPES.map(i => (
                        <OptionChip key={i} label={i} selected={(data.injuries || []).includes(i)} onClick={() => toggleInjury(i)} multi />
                    ))}
                </div>
            </Card>

            {hasInjuries && data.injuries.map((injury, idx) => (
                <Card key={injury} delay={0.05 * idx} className="border-[#E4F0EA] bg-gradient-to-br from-white to-[#E4F0EA]/30">
                    <p className="mb-3 font-semibold text-sm text-[#033135]">{injury}</p>
                    <div className="space-y-3">
                        <TextInput label="Which body part is affected?" placeholder="e.g. Left knee" value={data.injuryDetails?.[idx]?.bodyPart || ''} onChange={v => updateDetail(idx, 'bodyPart', v)} />
                        <div>
                            <p className="mb-2 text-xs font-semibold text-[#647572]">Status</p>
                            <div className="flex gap-2">
                                {['Active', 'Recovering'].map(s => (
                                    <button key={s} type="button" onClick={() => updateDetail(idx, 'status', s)}
                                        className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${data.injuryDetails?.[idx]?.status === s ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]' : 'border-[#E8EFEB] text-[#647572]'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold text-[#647572]">Causes pain during physical activity?</p>
                            <div className="flex gap-2">
                                {['Yes', 'No', 'Sometimes'].map(s => (
                                    <button key={s} type="button" onClick={() => updateDetail(idx, 'painDuringActivity', s)}
                                        className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${data.injuryDetails?.[idx]?.painDuringActivity === s ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]' : 'border-[#E8EFEB] text-[#647572]'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold text-[#647572]">Had surgery for this?</p>
                            <div className="flex gap-2">
                                {['Yes', 'No'].map(s => (
                                    <button key={s} type="button" onClick={() => updateDetail(idx, 'surgery', s)}
                                        className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${data.injuryDetails?.[idx]?.surgery === s ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]' : 'border-[#E8EFEB] text-[#647572]'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            ))}

            <NavButtons onNext={() => onNext()} onSkip={() => {
                const skipped = { injuries: ['None'], injuryDetails: [] }
                setData(skipped)
                onNext(skipped)
            }} />
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   STEP 5 — Lifestyle & Habits
══════════════════════════════════════════════════════════ */
const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise', emoji: '🛋️', bars: 1 },
    { id: 'lightly', label: 'Lightly Active', desc: '1–3 days light exercise', emoji: '🚶', bars: 2 },
    { id: 'moderately', label: 'Moderately Active', desc: '3–5 days exercise', emoji: '🏃', bars: 3 },
    { id: 'very', label: 'Very Active', desc: '6–7 days intense exercise', emoji: '⚡', bars: 4 },
]

function ActivityBars({ bars, selected }) {
    return (
        <div className="flex h-5 items-end gap-0.5">
            {[1, 2, 3, 4].map(n => (
                <span key={n} className={`w-1.5 rounded-full transition-colors ${n <= bars ? selected ? 'bg-[#033135]' : 'bg-[#324C4D]' : 'bg-[#C4D7D4]/50'}`}
                    style={{ height: `${4 + n * 4}px` }} />
            ))}
        </div>
    )
}

function Step5Lifestyle({ data, setData, onNext }) {
    const set = (f, v) => setData(d => ({ ...d, [f]: v }))

    return (
        <div className="space-y-5">
            <div className="fk-up mb-2">
                <p className="mb-1 text-[11px] font-bold tracking-[0.18em] text-[#647572]">LIFESTYLE & HABITS</p>
                <h2 className="text-3xl leading-tight text-[#033135] sm:text-4xl" style={{ fontFamily: SERIF }}>
                    Your daily lifestyle
                    <span className="ml-1 inline-block h-[0.12em] w-[0.12em] rounded-full bg-[#E0AE3A] align-baseline" />
                </h2>
            </div>

            {/* Activity Level */}
            <Card delay={0.05}>
                <SectionLabel icon={Activity} iconBg="bg-[#E4F0EA]" label="Current Activity Level" />
                <div className="grid grid-cols-2 gap-2">
                    {ACTIVITY_LEVELS.map(a => (
                        <button key={a.id} type="button" onClick={() => set('activityLevel', a.id)}
                            className={`flex flex-col items-start gap-3 rounded-2xl border-2 p-3 text-left transition-all ${data.activityLevel === a.id ? 'border-[#033135] bg-[#E4F0EA]' : 'border-[#E8EFEB] bg-white hover:border-[#C4D7D4]'}`}>
                            <div className="flex w-full items-center justify-between">
                                <span className="text-xl">{a.emoji}</span>
                                <ActivityBars bars={a.bars} selected={data.activityLevel === a.id} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#033135]">{a.label}</p>
                                <p className="text-[11px] text-[#647572] leading-snug">{a.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Sleep */}
            <Card delay={0.1}>
                <SectionLabel icon={Moon} iconBg="bg-[#DCD6F7]" label="Daily Sleep" sub="How many hours do you sleep?" />
                <SliderInput value={data.sleepHours ?? 7} onChange={v => set('sleepHours', v)} min={2} max={12} step={0.5} decimals={1} unit="hrs" />
            </Card>

            {/* Water */}
            <Card delay={0.15}>
                <SectionLabel icon={Droplet} iconBg="bg-[#C4D7D4]" label="Daily Water Intake" sub="How much water do you drink?" />
                <SliderInput value={data.waterLitres ?? 2} onChange={v => set('waterLitres', v)} min={0.1} max={8} step={0.1} decimals={1} unit="L" />
            </Card>

            {/* Sitting hours */}
            <Card delay={0.2}>
                <SectionLabel icon={Activity} iconBg="bg-[#FFD9C7]" label="Daily Sitting Hours" sub="How many hours do you spend sitting?" />
                <SliderInput value={data.sittingHours ?? 6} onChange={v => set('sittingHours', v)} min={0.5} max={16} step={0.5} decimals={1} unit="hrs" />
            </Card>

            {/* Smoking */}
            <Card delay={0.25}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Do you smoke?</p>
                <div className="flex flex-wrap gap-2">
                    {['Never', 'Occasionally', 'Regularly', 'Former smoker'].map(o => (
                        <OptionChip key={o} label={o} selected={data.smoking === o} onClick={() => set('smoking', o)} />
                    ))}
                </div>
            </Card>

            {/* Alcohol */}
            <Card delay={0.3}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Do you consume alcohol?</p>
                <div className="flex flex-wrap gap-2">
                    {['Never', 'Occasionally', 'Regularly'].map(o => (
                        <OptionChip key={o} label={o} selected={data.alcohol === o} onClick={() => set('alcohol', o)} />
                    ))}
                </div>
            </Card>

            {/* Stress */}
            <Card delay={0.35}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Daily stress level</p>
                <div className="flex gap-3">
                    {[
                        { id: 'Low', emoji: '😌', color: 'border-green-400 bg-green-50 text-green-700' },
                        { id: 'Moderate', emoji: '😐', color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
                        { id: 'High', emoji: '😰', color: 'border-red-400 bg-red-50 text-red-700' },
                    ].map(({ id, emoji, color }) => (
                        <button key={id} type="button" onClick={() => set('stress', id)}
                            className={`flex-1 flex flex-col items-center gap-1 rounded-2xl border-2 py-3 transition-all ${data.stress === id ? color : 'border-[#E8EFEB] bg-white text-[#647572]'}`}>
                            <span className="text-2xl">{emoji}</span>
                            <span className="text-xs font-semibold">{id}</span>
                        </button>
                    ))}
                </div>
            </Card>

            <NavButtons onNext={() => onNext()} onSkip={() => onNext()} />
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   STEP 6 — Diet & Nutrition
══════════════════════════════════════════════════════════ */
const DIET_PREFS = [
    { id: 'vegetarian', label: 'Vegetarian', emoji: '🥦' },
    { id: 'vegan', label: 'Vegan', emoji: '🌱' },
    { id: 'eggetarian', label: 'Eggetarian', emoji: '🥚' },
    { id: 'non-veg', label: 'Non-vegetarian', emoji: '🍗' },
]
const MEAL_FREQ = ['1–2', '3–4', '5+']
const INTOLERANCES = ['Lactose', 'Gluten', 'Other', 'None']
const DEFICIENCIES = ['Iron', 'Vitamin B12', 'Vitamin D', 'Other', 'None']
const DIGESTIVE = ['Acidity', 'Bloating', 'Constipation', 'Other', 'None']

function Step6Diet({ data, setData, onNext, isSaving = false }) {
    const set = (f, v) => setData(d => ({ ...d, [f]: v }))
    const toggleMulti = (field, val) => setData(d => {
        const list = d[field] || []
        if (val === 'None') return { ...d, [field]: list.includes('None') ? [] : ['None'] }
        const without = list.filter(x => x !== 'None' && x !== val)
        return { ...d, [field]: list.includes(val) ? without : [...without, val] }
    })

    const handleSkip = () => {
        const skipped = {
            ...data,
            dietPref: data.dietPref || 'vegetarian',
            intolerances: data.intolerances?.length ? data.intolerances : ['None'],
            deficiencies: data.deficiencies?.length ? data.deficiencies : ['None'],
            digestive: data.digestive?.length ? data.digestive : ['None']
        }
        setData(skipped)
        onNext(skipped)
    }

    return (
        <div className="space-y-5">
            <div className="fk-up mb-2">
                <p className="mb-1 text-[11px] font-bold tracking-[0.18em] text-[#647572]">DIET & NUTRITION</p>
                <h2 className="text-3xl leading-tight text-[#033135] sm:text-4xl" style={{ fontFamily: SERIF }}>
                    What you eat matters
                    <span className="ml-1 inline-block h-[0.12em] w-[0.12em] rounded-full bg-[#E0AE3A] align-baseline" />
                </h2>
            </div>

            {/* Diet preference */}
            <Card delay={0.05}>
                <SectionLabel icon={Utensils} iconBg="bg-[#E4F0EA]" label="Dietary Preference" />
                <div className="grid grid-cols-2 gap-3">
                    {DIET_PREFS.map(p => (
                        <button key={p.id} type="button" onClick={() => set('dietPref', p.id)}
                            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all ${data.dietPref === p.id ? 'border-[#033135] bg-[#E4F0EA]' : 'border-[#E8EFEB] bg-white hover:border-[#C4D7D4]'}`}>
                            <span className="text-2xl">{p.emoji}</span>
                            <span className="text-sm font-semibold text-[#033135]">{p.label}</span>
                            {data.dietPref === p.id && <Check size={14} strokeWidth={3} className="ml-auto text-[#033135]" />}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Meals per day */}
            <Card delay={0.1}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Meals eaten per day</p>
                <div className="flex gap-2">
                    {MEAL_FREQ.map(m => (
                        <button key={m} type="button" onClick={() => set('mealsPerDay', m)}
                            className={`flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-all ${data.mealsPerDay === m ? 'border-[#033135] bg-[#E4F0EA] text-[#033135]' : 'border-[#E8EFEB] text-[#647572]'}`}>
                            {m}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Specific diet */}
            <Card delay={0.15}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Following a specific diet?</p>
                <div className="flex gap-2 mb-3">
                    {['Yes', 'No'].map(o => (
                        <RadioRow key={o} label={o} selected={data.specificDiet === o} onClick={() => set('specificDiet', o)} />
                    ))}
                </div>
                {data.specificDiet === 'Yes' && (
                    <TextInput placeholder="e.g. Keto, Mediterranean, Intermittent Fasting" value={data.specificDietName || ''} onChange={v => set('specificDietName', v)} />
                )}
            </Card>

            {/* Intolerances */}
            <Card delay={0.2}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Food intolerances</p>
                <div className="flex flex-wrap gap-2">
                    {INTOLERANCES.map(i => (
                        <OptionChip key={i} label={i} selected={(data.intolerances || []).includes(i)} onClick={() => toggleMulti('intolerances', i)} multi />
                    ))}
                </div>
            </Card>

            {/* Deficiencies */}
            <Card delay={0.25}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Nutritional deficiencies diagnosed?</p>
                <div className="flex flex-wrap gap-2">
                    {DEFICIENCIES.map(d => (
                        <OptionChip key={d} label={d} selected={(data.deficiencies || []).includes(d)} onClick={() => toggleMulti('deficiencies', d)} multi />
                    ))}
                </div>
            </Card>

            {/* Digestive issues */}
            <Card delay={0.3}>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#647572]">Digestive issues?</p>
                <div className="flex flex-wrap gap-2">
                    {DIGESTIVE.map(d => (
                        <OptionChip key={d} label={d} selected={(data.digestive || []).includes(d)} onClick={() => toggleMulti('digestive', d)} multi />
                    ))}
                </div>
            </Card>

            <NavButtons onNext={() => onNext()} onSkip={handleSkip} isLoading={isSaving} />
        </div>
    )
}

/* ══════════════════════════════════════════════════════════
   MAIN ORCHESTRATOR
══════════════════════════════════════════════════════════ */
function HealthHistory() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const basicInfo = location.state || {}

    const [step, setStep] = useState(0) // 0..5 = steps 1-6
    const [isSaving, setIsSaving] = useState(false)
    const [cachedProfile, setCachedProfile] = useState(null)

    const [medicalConditions, setMedicalConditions] = useState({ conditions: [], conditionDetails: [] })
    const [medications, setMedications] = useState({ takingMeds: '', medications: [], inTreatment: '', supplements: [], uploadTypes: [] })
    const [allergies, setAllergies] = useState({ allergies: [], allergyDetails: [] })
    const [injuries, setInjuries] = useState({ injuries: [], injuryDetails: [] })
    const [lifestyle, setLifestyle] = useState({ sleepHours: 7, waterLitres: 2.0, sittingHours: 6 })
    const [diet, setDiet] = useState({ intolerances: [], deficiencies: [], digestive: [] })

    // Resolves basic info using location state first, then prefilled profile
    const finalHeight = basicInfo.height != null ? basicInfo.height : cachedProfile?.height_cm
    const finalWeight = basicInfo.weight != null ? basicInfo.weight : cachedProfile?.weight_kg
    const finalGender = basicInfo.sex || cachedProfile?.gender
    const finalAge = basicInfo.age != null ? basicInfo.age : cachedProfile?.age
    const finalBloodGroup = basicInfo.bloodGroup || cachedProfile?.blood_group

    // Prefetch existing health history if user already has saved records
    useEffect(() => {
        if (!user?.id) return
        let isMounted = true

        async function loadExistingData() {
            try {
                // 1. health_profiles
                const { data: hp } = await supabase
                    .from('health_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (hp && isMounted) {
                    setCachedProfile(hp)

                    setLifestyle(prev => ({
                        ...prev,
                        activityLevel: hp.activity_level || prev.activityLevel,
                        sleepHours: hp.sleep_hours != null ? Number(hp.sleep_hours) : prev.sleepHours,
                        waterLitres: hp.water_litres != null ? Number(hp.water_litres) : prev.waterLitres,
                        sittingHours: hp.sitting_hours != null ? Number(hp.sitting_hours) : prev.sittingHours,
                        smoking: hp.smoking || prev.smoking,
                        alcohol: hp.alcohol || prev.alcohol,
                        stress: hp.stress || prev.stress,
                    }))

                    setDiet(prev => ({
                        ...prev,
                        dietPref: hp.dietary_preference || prev.dietPref,
                        mealsPerDay: hp.meals_per_day || prev.mealsPerDay,
                        specificDiet: hp.specific_diet || prev.specificDiet,
                        specificDietName: hp.specific_diet_name || prev.specificDietName,
                        intolerances: Array.isArray(hp.intolerances) ? hp.intolerances : prev.intolerances,
                        deficiencies: Array.isArray(hp.deficiencies) ? hp.deficiencies : prev.deficiencies,
                        digestive: Array.isArray(hp.digestive_issues) ? hp.digestive_issues : prev.digestive,
                    }))

                    if (hp.in_treatment || (Array.isArray(hp.supplements) && hp.supplements.length > 0)) {
                        setMedications(prev => ({
                            ...prev,
                            inTreatment: hp.in_treatment || prev.inTreatment,
                            treatmentCondition: hp.treatment_condition || prev.treatmentCondition,
                            treatmentType: hp.treatment_type || prev.treatmentType,
                            treatmentRestrictions: hp.treatment_restrictions || prev.treatmentRestrictions,
                            supplements: Array.isArray(hp.supplements) ? hp.supplements : prev.supplements,
                        }))
                    }
                }

                // 2. medical_conditions
                const { data: conds } = await supabase
                    .from('medical_conditions')
                    .select('*')
                    .eq('user_id', user.id)

                if (conds && conds.length > 0 && isMounted) {
                    setMedicalConditions({
                        conditions: conds.map(c => c.condition_name),
                        conditionDetails: conds.map(c => ({
                            year: c.diagnosis_year || '',
                            controlled: c.is_controlled || (c.status === 'Controlled' ? 'Yes' : c.status === 'Uncontrolled' ? 'No' : 'Not sure')
                        }))
                    })
                }

                // 3. medications
                const { data: meds } = await supabase
                    .from('medications')
                    .select('*')
                    .eq('user_id', user.id)

                if (meds && meds.length > 0 && isMounted) {
                    setMedications(prev => ({
                        ...prev,
                        takingMeds: 'Yes',
                        medications: meds.map(m => ({
                            name: m.medication_name || '',
                            dosage: m.dosage || '',
                            frequency: m.frequency || '',
                            reason: m.reason || (m.notes?.startsWith('Reason: ') ? m.notes.replace('Reason: ', '') : '')
                        }))
                    }))
                }

                // 4. allergies
                try {
                    const { data: algs } = await supabase
                        .from('allergies')
                        .select('*')
                        .eq('user_id', user.id)

                    if (algs && algs.length > 0 && isMounted) {
                        setAllergies({
                            allergies: algs.map(a => a.allergy_type),
                            allergyDetails: algs.map(a => ({
                                allergen: a.allergen || '',
                                reaction: a.reaction || '',
                                severity: a.severity || 'Mild'
                            }))
                        })
                    }
                } catch {
                    // Ignore if allergies table was not yet queried
                }

                // 5. injuries
                try {
                    const { data: injs } = await supabase
                        .from('injuries')
                        .select('*')
                        .eq('user_id', user.id)

                    if (injs && injs.length > 0 && isMounted) {
                        setInjuries({
                            injuries: injs.map(i => i.injury_type),
                            injuryDetails: injs.map(i => ({
                                bodyPart: i.body_part || '',
                                status: i.status || 'Active',
                                painDuringActivity: i.pain_during_activity || 'No',
                                surgery: i.surgery || 'No'
                            }))
                        })
                    }
                } catch {
                    // Ignore if injuries table was not yet queried
                }
            } catch (err) {
                console.error('Failed to prefetch existing health history:', err)
            }
        }

        loadExistingData()
        return () => {
            isMounted = false
        }
    }, [user?.id])

    const handleSaveAndComplete = async (finalDietOverride) => {
        if (isSaving) return

        const currentUserId = user?.id || (await supabase.auth.getUser()).data?.user?.id
        if (!currentUserId) {
            toast.error('You must be logged in to save your health history.')
            return
        }

        const currentDiet = finalDietOverride || diet
        const currentMedicalConditions = medicalConditions
        const currentMedications = medications
        const currentAllergies = allergies
        const currentInjuries = injuries
        const currentLifestyle = lifestyle

        setIsSaving(true)

        try {
            // Pair each selected condition with its original detail index FIRST, then filter out blanks/'None'
            const conditionRows = (currentMedicalConditions.conditions || [])
                .map((cond, idx) => ({
                    cond,
                    detail: currentMedicalConditions.conditionDetails?.[idx] || {},
                }))
                .filter(({ cond }) => cond && cond !== 'None' && cond.trim() !== '')
                .map(({ cond, detail }) => ({
                    condition_name: cond,
                    diagnosis_year: detail.year?.trim() || null,
                    is_controlled: detail.controlled || null,
                    status: 'active',
                    notes: detail.year ? `Diagnosed: ${detail.year}` : null,
                }))

            // Prepare medications rows (skip empty medication names)
            const validMeds = currentMedications.takingMeds === 'Yes' && Array.isArray(currentMedications.medications)
                ? currentMedications.medications.filter(m => m && m.name && m.name.trim() !== '')
                : []
            const medicationRows = validMeds.map(m => ({
                medication_name: m.name.trim(),
                dosage: m.dosage?.trim() || null,
                frequency: m.frequency?.trim() || null,
                reason: m.reason?.trim() || null,
                status: 'active',
            }))

            // Pair each selected allergy with its original detail index FIRST, then filter out blanks/'No known allergies'
            const allergyRows = (currentAllergies.allergies || [])
                .map((alg, idx) => ({
                    alg,
                    detail: currentAllergies.allergyDetails?.[idx] || {},
                }))
                .filter(({ alg }) => alg && alg !== 'No known allergies' && alg.trim() !== '')
                .map(({ alg, detail }) => ({
                    allergy_type: alg,
                    allergen: detail.allergen?.trim() || null,
                    reaction: detail.reaction?.trim() || null,
                    severity: detail.severity || null,
                }))

            // Pair each selected injury with its original detail index FIRST, then filter out blanks/'None'
            const injuryRows = (currentInjuries.injuries || [])
                .map((inj, idx) => ({
                    inj,
                    detail: currentInjuries.injuryDetails?.[idx] || {},
                }))
                .filter(({ inj }) => inj && inj !== 'None' && inj.trim() !== '')
                .map(({ inj, detail }) => ({
                    injury_type: inj,
                    body_part: detail.bodyPart?.trim() || null,
                    status: detail.status || null,
                    pain_during_activity: detail.painDuringActivity || null,
                    surgery: detail.surgery || null,
                }))

            // Prepare health_profiles payload
            const profilePayload = {
                ...(finalHeight != null ? { height_cm: Number(finalHeight) } : {}),
                ...(finalWeight != null ? { weight_kg: Number(finalWeight) } : {}),
                ...(finalGender ? { gender: finalGender } : {}),
                ...(finalAge != null ? { age: Number(finalAge) } : {}),
                ...(finalBloodGroup ? { blood_group: finalBloodGroup } : {}),
                activity_level: currentLifestyle.activityLevel || null,
                sleep_hours: currentLifestyle.sleepHours != null ? Number(currentLifestyle.sleepHours) : null,
                water_litres: currentLifestyle.waterLitres != null ? Number(currentLifestyle.waterLitres) : null,
                sitting_hours: currentLifestyle.sittingHours != null ? Number(currentLifestyle.sittingHours) : null,
                smoking: currentLifestyle.smoking || null,
                alcohol: currentLifestyle.alcohol || null,
                stress: currentLifestyle.stress || null,
                meals_per_day: currentDiet.mealsPerDay || null,
                specific_diet: currentDiet.specificDiet || null,
                specific_diet_name: currentDiet.specificDiet === 'Yes' ? (currentDiet.specificDietName?.trim() || null) : null,
                intolerances: (currentDiet.intolerances || []).filter(x => x && x !== 'None'),
                deficiencies: (currentDiet.deficiencies || []).filter(x => x && x !== 'None'),
                digestive_issues: (currentDiet.digestive || []).filter(x => x && x !== 'None'),
                supplements: (currentMedications.supplements || []).filter(x => x && x !== 'None'),
                in_treatment: currentMedications.inTreatment || null,
                treatment_condition: currentMedications.inTreatment === 'Yes' ? (currentMedications.treatmentCondition?.trim() || null) : null,
                treatment_type: currentMedications.inTreatment === 'Yes' ? currentMedications.treatmentType || null : null,
                treatment_restrictions: currentMedications.inTreatment === 'Yes' ? currentMedications.treatmentRestrictions || null : null,
                dietary_preference: currentDiet.dietPref || null,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
            }

            // Execute atomic RPC as the single persistence mechanism
            const { error: rpcError } = await supabase.rpc('save_health_history_onboarding', {
                p_profile: profilePayload,
                p_conditions: conditionRows,
                p_medications: medicationRows,
                p_allergies: allergyRows,
                p_injuries: injuryRows,
            })

            if (rpcError) {
                throw rpcError
            }

            toast.success('Health profile saved successfully!')
            navigate('/all-done', {
                state: {
                    ...(location.state || {}),
                    journey: basicInfo.journey || location.state?.journey || null,
                },
            })
        } catch (err) {
            console.error('Failed to save health history onboarding:', err)
            toast.error(err.message || 'Failed to save health history. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const next = (stepDataOverride) => {
        if (step === 0 && stepDataOverride) {
            setMedicalConditions(stepDataOverride)
        } else if (step === 1 && stepDataOverride) {
            setMedications(stepDataOverride)
        } else if (step === 2 && stepDataOverride) {
            setAllergies(stepDataOverride)
        } else if (step === 3 && stepDataOverride) {
            setInjuries(stepDataOverride)
        } else if (step === 4 && stepDataOverride) {
            setLifestyle(stepDataOverride)
        }

        if (step < TOTAL_STEPS - 1) {
            setStep(s => s + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            // Final step completion
            handleSaveAndComplete(stepDataOverride)
        }
    }

    const back = () => {
        if (step === 0) {
            navigate('/wellness-setup', {
                state: {
                    ...(location.state || {}),
                    journey: basicInfo.journey || location.state?.journey || null,
                    age: finalAge,
                    sex: finalGender,
                    height: finalHeight,
                    weight: finalWeight,
                    bloodGroup: finalBloodGroup,
                },
            })
        } else {
            setStep(s => s - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const stepComponents = [
        <Step1MedicalConditions data={medicalConditions} setData={setMedicalConditions} onNext={(d) => next(d)} onBack={back} />,
        <Step2Medications data={medications} setData={setMedications} onNext={(d) => next(d)} />,
        <Step3Allergies data={allergies} setData={setAllergies} onNext={(d) => next(d)} />,
        <Step4Injuries data={injuries} setData={setInjuries} onNext={(d) => next(d)} />,
        <Step5Lifestyle data={lifestyle} setData={setLifestyle} onNext={(d) => next(d)} />,
        <Step6Diet data={diet} setData={setDiet} onNext={(d) => next(d)} isSaving={isSaving} />,
    ]

    return (
        <div className="min-h-screen bg-[#F8FAF7] px-4 py-8 sm:py-12">
            <style>{`
                @keyframes fk-up {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fk-up { animation: fk-up 0.5s ease-out both; }
                @media (prefers-reduced-motion: reduce) { .fk-up { animation: none; } }
                .custom-select { -webkit-appearance: none; appearance: none; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 1px; height: 1px; }
                input[type=range]::-moz-range-thumb { width: 1px; height: 1px; border: none; }
            `}</style>

            <div className="mx-auto max-w-xl">
                <StepHeader step={step} onBack={back} />
                <ProgressBar step={step} />

                {/* Step content — key forces remount & re-animation on step change */}
                <div key={step}>
                    {stepComponents[step]}
                </div>
            </div>
        </div>
    )
}

export default HealthHistory
