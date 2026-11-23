import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
    IndianRupee,
    TrendingUp,
    Percent,
    Wallet,
    ArrowLeft,
    CheckCircle2,
    Settings,
} from 'lucide-react'
import { getCurrentProfessional } from '../../../services/professional/professionalAuthService.js'
import {
    getEarningsSummary,
    getPayoutSettings,
} from '../../../services/professional/professionalConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function ConsultationEarnings() {
    const { professional: contextProf } = useOutletContext() || {}
    const [professional, setProfessional] = useState(contextProf || null)
    const [summary, setSummary] = useState(null)
    const [payoutSettings, setPayoutSettings] = useState(null)

    useEffect(() => {
        const prof = contextProf || getCurrentProfessional()
        if (prof?.id) {
            setProfessional(prof)
            setSummary(getEarningsSummary(prof.id))
            setPayoutSettings(getPayoutSettings(prof.id))
        }
    }, [contextProf])

    if (!summary) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#033135] border-t-transparent" />
            </div>
        )
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
                        <span className="text-[#033135]">Earnings</span>
                    </div>
                    <h1
                        className="mt-1 text-2xl sm:text-3xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        Consultation Earnings
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Transparent breakdown of consultation revenues, 10% platform fee, net earnings, and payout status.
                    </p>
                </div>

                <Link
                    to="/professional/consultations/payments"
                    className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#324C4D] transition"
                >
                    <Settings size={14} />
                    <span>Payment Settings</span>
                </Link>
            </div>

            {/* Payout Status Alert Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#DCE7E3] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135]">
                        <Wallet size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#033135]">
                                Active Payout Destination:
                            </p>
                            <span className="rounded-full bg-[#E4F0EA] px-2 py-0.5 text-[10px] font-bold text-[#033135]">
                                {payoutSettings?.preferredPayoutMethod === 'upi' ? 'UPI' : 'Bank Transfer'}
                            </span>
                        </div>
                        <p className="text-[11px] text-[#647572]">
                            {payoutSettings?.preferredPayoutMethod === 'upi'
                                ? `UPI ID: ${payoutSettings?.payoutUpiId || 'Not configured'}`
                                : `Bank: ${payoutSettings?.bankName || 'HDFC Bank'} · A/C: ${payoutSettings?.accountNumberMasked || '•••• 4892'}`}
                        </p>
                    </div>
                </div>

                <Link
                    to="/professional/consultations/payments"
                    className="text-xs font-bold text-[#033135] underline hover:text-[#648C83]"
                >
                    Manage Payout Account →
                </Link>
            </div>

            {/* Financial Overview Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Gross */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#647572]">
                        Gross Revenue
                    </p>
                    <p
                        className="mt-2 text-2xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        ₹{summary.grossEarnings.toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-[10px] text-[#647572]">
                        {summary.completedCount} completed sessions
                    </p>
                </div>

                {/* Platform Fee */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#647572]">
                            Platform Fee
                        </p>
                        <span className="rounded-md bg-[#FAFBF9] border border-[#E8EFEB] px-1.5 py-0.2 text-[10px] font-bold text-[#647572]">
                            10%
                        </span>
                    </div>
                    <p
                        className="mt-2 text-2xl font-bold text-[#C0563B]"
                        style={{ fontFamily: SERIF }}
                    >
                        -₹{summary.platformFee.toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-[10px] text-[#647572]">
                        FitKey platform & telephony
                    </p>
                </div>

                {/* Net Earnings */}
                <div className="rounded-2xl border border-[#DCE7E3] bg-[#E4F0EA]/40 p-4 shadow-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#033135]">
                        Net Earnings (90%)
                    </p>
                    <p
                        className="mt-2 text-2xl font-bold text-[#2F7B58]"
                        style={{ fontFamily: SERIF }}
                    >
                        ₹{summary.netEarnings.toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-[10px] text-[#2F7B58] font-medium">
                        Total earned after deductions
                    </p>
                </div>

                {/* Pending Payout */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#647572]">
                        Pending Payout
                    </p>
                    <p
                        className="mt-2 text-2xl font-bold text-[#8B6D25]"
                        style={{ fontFamily: SERIF }}
                    >
                        ₹{summary.pendingPayout.toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-[10px] text-[#8B6D25] font-medium">
                        Settling in next cycle (Fri)
                    </p>
                </div>

                {/* Completed Payout */}
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-4 shadow-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#647572]">
                        Settled to Bank
                    </p>
                    <p
                        className="mt-2 text-2xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        ₹{summary.completedPayouts.toLocaleString('en-IN')}
                    </p>
                    <p className="mt-1 text-[10px] text-[#2F7B58] font-medium">
                        Successfully transferred
                    </p>
                </div>
            </div>

            {/* Payout Breakdown Ledger */}
            <div className="rounded-2xl border border-[#E8EFEB] bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-4">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#033135]">
                            Session Earnings Breakdown & Ledger
                        </h3>
                        <p className="text-xs text-[#647572] mt-0.5">
                            Transaction audit trail per completed phone consultation.
                        </p>
                    </div>
                </div>

                {(!summary.history || summary.history.length === 0) ? (
                    <div className="py-8 text-center text-xs text-[#9AA6A0]">
                        No consultation earnings recorded yet.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-[#E8EFEB] text-[11px] font-bold uppercase text-[#647572]">
                                    <th className="pb-3">Date</th>
                                    <th className="pb-3">Patient / Ref</th>
                                    <th className="pb-3">Gross Fee</th>
                                    <th className="pb-3">Platform Fee (10%)</th>
                                    <th className="pb-3">Net Earned</th>
                                    <th className="pb-3 text-right">Payout Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8EFEB]">
                                {summary.history.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-[#FAFBF9] transition">
                                        <td className="py-3 font-medium text-[#033135]">{tx.date}</td>
                                        <td className="py-3">
                                            <p className="font-bold text-[#033135]">{tx.patientName}</p>
                                            <p className="text-[10px] text-[#9AA6A0]">{tx.id}</p>
                                        </td>
                                        <td className="py-3 font-semibold text-[#033135]">₹{tx.grossFee}</td>
                                        <td className="py-3 text-[#C0563B] font-medium">-₹{tx.platformFee}</td>
                                        <td className="py-3 font-bold text-[#2F7B58]">₹{tx.netEarned}</td>
                                        <td className="py-3 text-right">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2 py-0.5 text-[10px] font-bold text-[#033135]">
                                                <CheckCircle2 size={11} className="text-[#2F7B58]" />
                                                PROCESSED
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
