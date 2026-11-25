import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
    Building2,
    ShieldCheck,
    Lock,
    Save,
    ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    fetchPayoutSettings,
    getPayoutSettings,
    savePayoutSettings,
} from '../../../services/professional/professionalConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function PaymentSettings() {
    const { professional } = useOutletContext() || {}
    const [payoutForm, setPayoutForm] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (professional?.id) {
            fetchPayoutSettings(professional.id).then((settings) => {
                const saved = settings?.payoutSettings || {}
                setPayoutForm({
                    preferredPayoutMethod: saved.preferredPayoutMethod || 'upi',
                    payoutUpiId: saved.payoutUpiId || '',
                    accountHolderName: saved.accountHolderName || '',
                    bankName: saved.bankName || '',
                    accountNumber: '',
                    accountNumberMasked: saved.accountNumberMasked || '',
                    ifscCode: saved.ifscCode || '',
                })
                if (!settings?.success) toast.error(settings?.error || 'Could not load payout settings.')
            }).catch((error) => toast.error(error?.message || 'Could not load payout settings.'))
        }
    }, [professional?.id])

    if (!payoutForm) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!professional?.id) return

        if (payoutForm.preferredPayoutMethod === 'upi') {
            if (!payoutForm.payoutUpiId.trim() || !payoutForm.payoutUpiId.includes('@')) {
                toast.error('Please enter a valid UPI ID (e.g. name@upi or doctor@okhdfcbank).')
                return
            }
        } else {
            if (!payoutForm.accountHolderName.trim()) {
                toast.error('Please provide Account Holder Name.')
                return
            }
            if (!payoutForm.bankName.trim()) {
                toast.error('Please provide Bank Name.')
                return
            }
            if (!payoutForm.accountNumber.trim() && !payoutForm.accountNumberMasked) {
                toast.error('Please provide Account Number.')
                return
            }
            if (!payoutForm.ifscCode.trim()) {
                toast.error('Please provide IFSC Code.')
                return
            }
        }

        setSaving(true)
        const res = await savePayoutSettings(professional.id, payoutForm)
        setSaving(false)

        if (res.success) {
            toast.success('Payout payment settings saved safely!')
            const updated = getPayoutSettings(professional.id)
            setPayoutForm((prev) => ({
                ...prev,
                accountNumberMasked: updated.accountNumberMasked,
                accountNumber: '',
            }))
        } else {
            toast.error(res.error || 'Could not save payout settings.')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#647572]">
                        <Link
                            to="/professional/consultations"
                            className="flex items-center gap-1 hover:text-[#033135] transition"
                        >
                            <ArrowLeft size={14} />
                            Consultations
                        </Link>
                        <span>/</span>
                        <span className="text-[#033135]">Payment Settings</span>
                    </div>
                    <h1
                        className="mt-1 text-2xl sm:text-3xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        Payout & Payment Settings
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Configure how FitKey disburses your earned consultation fees directly to your bank account or UPI ID.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-3 py-1 text-xs font-bold text-[#033135]">
                        <ShieldCheck size={14} className="text-[#2F7B58]" />
                        256-Bit Payout Security
                    </span>
                </div>
            </div>

            {/* Important Security Reassurance Box */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-[#DCE7E3] bg-[#E4F0EA]/50 p-5 text-xs text-[#033135] shadow-xs">
                <Lock size={20} className="shrink-0 text-[#033135] mt-0.5" />
                <div className="space-y-1">
                    <h4 className="font-bold text-sm">
                        Zero Sensitive Credential Guarantee
                    </h4>
                    <p className="text-[#324C4D] leading-relaxed">
                        FitKey only stores deposit destination information to credit your earned consultation fees. <strong>We NEVER ask for, nor do we store, your UPI PIN, online banking passwords, debit card numbers, or CVVs.</strong> Payouts are safely processed via regulated National Payments Corporation of India (NPCI) and Reserve Bank of India (RBI) authorized clearing houses.
                    </p>
                </div>
            </div>

            {/* Settings Form */}
            <form onSubmit={handleSave} className="rounded-2xl border border-[#E8EFEB] bg-white p-5 sm:p-7 shadow-xs space-y-6">
                <div>
                    <h3 className="text-sm font-bold text-[#033135]">
                        Preferred Payout Disbursement Method
                    </h3>
                    <p className="text-xs text-[#647572] mt-0.5">
                        Select whether you prefer direct instant UPI transfers or standard NEFT/IMPS bank deposits.
                    </p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setPayoutForm((prev) => ({ ...prev, preferredPayoutMethod: 'upi' }))}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${payoutForm.preferredPayoutMethod === 'upi'
                                ? 'border-[#033135] bg-[#E4F0EA]/40 text-[#033135] ring-2 ring-[#033135]/20 font-bold'
                                : 'border-[#E8EFEB] bg-[#FAFBF9] text-[#647572] hover:bg-white'
                                }`}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#DCE7E3] text-[#033135]">
                                ⚡
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#033135]">UPI ID (Instant Settlement)</p>
                                <p className="text-[11px] text-[#647572]">Google Pay, PhonePe, Paytm, BHIM</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPayoutForm((prev) => ({ ...prev, preferredPayoutMethod: 'bank_transfer' }))}
                            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${payoutForm.preferredPayoutMethod === 'bank_transfer'
                                ? 'border-[#033135] bg-[#E4F0EA]/40 text-[#033135] ring-2 ring-[#033135]/20 font-bold'
                                : 'border-[#E8EFEB] bg-[#FAFBF9] text-[#647572] hover:bg-white'
                                }`}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#DCE7E3] text-[#033135]">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#033135]">Direct Bank Account (NEFT / IMPS)</p>
                                <p className="text-[11px] text-[#647572]">Any Indian savings or current bank account</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Conditional Fields based on method */}
                {payoutForm.preferredPayoutMethod === 'upi' ? (
                    <div className="rounded-xl border border-[#E8EFEB] bg-[#FAFBF9] p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-[#324C4D] mb-1">
                                Virtual Payment Address / UPI ID *
                            </label>
                            <input
                                type="text"
                                value={payoutForm.payoutUpiId}
                                onChange={(e) => setPayoutForm({ ...payoutForm, payoutUpiId: e.target.value })}
                                placeholder="e.g. dr.ananya@oksbi or 9876543210@paytm"
                                className="w-full rounded-xl border border-[#DCE7E3] bg-white px-4 py-2.5 text-xs font-medium text-[#033135] outline-none focus:border-[#648C83]"
                            />
                            <p className="mt-1 text-[11px] text-[#647572]">
                                Consultation fees will be credited to the account linked to this UPI ID every billing cycle.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-[#E8EFEB] bg-[#FAFBF9] p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#324C4D] mb-1">
                                    Account Holder Name *
                                </label>
                                <input
                                    type="text"
                                    value={payoutForm.accountHolderName}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, accountHolderName: e.target.value })}
                                    placeholder="Name as per bank passbook"
                                    className="w-full rounded-xl border border-[#DCE7E3] bg-white px-4 py-2.5 text-xs font-medium text-[#033135] outline-none focus:border-[#648C83]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#324C4D] mb-1">
                                    Bank Name *
                                </label>
                                <input
                                    type="text"
                                    value={payoutForm.bankName}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                                    placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                                    className="w-full rounded-xl border border-[#DCE7E3] bg-white px-4 py-2.5 text-xs font-medium text-[#033135] outline-none focus:border-[#648C83]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#324C4D] mb-1">
                                    Account Number *
                                </label>
                                <input
                                    type="text"
                                    value={payoutForm.accountNumber}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                                    placeholder={payoutForm.accountNumberMasked || 'e.g. 501002348921'}
                                    className="w-full rounded-xl border border-[#DCE7E3] bg-white px-4 py-2.5 text-xs font-medium text-[#033135] outline-none focus:border-[#648C83]"
                                />
                                {payoutForm.accountNumberMasked && (
                                    <p className="mt-1 text-[10px] text-[#647572]">
                                        Current saved account: {payoutForm.accountNumberMasked}. Leave blank to keep unchanged.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#324C4D] mb-1">
                                    Bank IFSC Code *
                                </label>
                                <input
                                    type="text"
                                    value={payoutForm.ifscCode}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, ifscCode: e.target.value.toUpperCase() })}
                                    placeholder="e.g. HDFC0001234"
                                    className="w-full rounded-xl border border-[#DCE7E3] bg-white px-4 py-2.5 text-xs font-medium uppercase text-[#033135] outline-none focus:border-[#648C83]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 border-t border-[#E8EFEB] pt-4">
                    <Link
                        to="/professional/consultations"
                        className="rounded-xl border border-[#DCE7E3] px-4 py-2.5 text-xs font-semibold text-[#647572] hover:bg-[#FAFBF9]"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#324C4D] transition disabled:opacity-50"
                    >
                        <Save size={15} />
                        <span>{saving ? 'Saving...' : 'Save Payout Details'}</span>
                    </button>
                </div>
            </form>
        </div>
    )
}
