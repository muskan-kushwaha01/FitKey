import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
    Calendar,
    Clock,
    Phone,
    User,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowLeft,
    FileText,
    Search,
    Eye,
    X,
    Activity,
    Pill,
    AlertTriangle,
} from 'lucide-react'
import { fetchAppointments } from '../../../services/professional/professionalConsultationService.js'
import toast from 'react-hot-toast'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

export default function ConsultationHistory() {
    const { professional: contextProf } = useOutletContext() || {}
    const [professional, setProfessional] = useState(contextProf || null)
    const [allAppointments, setAllAppointments] = useState([])
    const [filter, setFilter] = useState('all') // all, completed, cancelled, no_show
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedAptDetails, setSelectedAptDetails] = useState(null)

    useEffect(() => {
        const prof = contextProf
        if (prof?.id) {
            setProfessional(prof)
            fetchAppointments(prof.id).then((result) => {
                setAllAppointments(Array.isArray(result?.appointments) ? result.appointments : [])
                if (!result?.success) toast.error(result?.error || 'Could not load consultation history.')
            }).catch((error) => {
                setAllAppointments([])
                toast.error(error?.message || 'Could not load consultation history.')
            })
        }
    }, [contextProf])

    const filteredAppointments = allAppointments.filter((apt) => {
        const matchesFilter = filter === 'all' ? true : apt.status === filter
        const term = searchTerm.trim().toLowerCase()
        if (!term) return matchesFilter

        const matchesSearch =
            apt.patientName?.toLowerCase().includes(term) ||
            apt.date?.includes(term) ||
            apt.patientPhone?.includes(term) ||
            apt.notes?.toLowerCase().includes(term) ||
            apt.cancellationReason?.toLowerCase().includes(term)

        return matchesFilter && matchesSearch
    })

    const counts = {
        all: allAppointments.length,
        completed: allAppointments.filter((a) => a.status === 'completed').length,
        cancelled: allAppointments.filter((a) => a.status === 'cancelled').length,
        no_show: allAppointments.filter((a) => a.status === 'no_show').length,
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F0EA] px-2.5 py-0.5 text-[10px] font-bold text-[#033135]">
                        <CheckCircle2 size={12} className="text-[#2F7B58]" />
                        COMPLETED
                    </span>
                )
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-[#C0563B]">
                        <XCircle size={12} />
                        CANCELLED
                    </span>
                )
            case 'no_show':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-[#8B6D25]">
                        <AlertCircle size={12} />
                        NO-SHOW
                    </span>
                )
            default:
                return (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-[#647572] uppercase">
                        {status}
                    </span>
                )
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
                        <span className="text-[#033135]">History</span>
                    </div>
                    <h1
                        className="mt-1 text-2xl sm:text-3xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        Consultation History
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Complete audit log of past consultations, clinical outcomes, cancellation reasons, and patient records.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/professional/consultations/appointments"
                        className="rounded-xl border border-[#DCE7E3] bg-white px-4 py-2 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                    >
                        Upcoming Appointments
                    </Link>
                    <Link
                        to="/professional/consultations/earnings"
                        className="rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition shadow-xs"
                        style={{ color: '#ffffff' }}
                    >
                        View Earnings
                    </Link>
                </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EFEB] pb-4">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { id: 'all', label: 'All Records' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'cancelled', label: 'Cancelled' },
                        { id: 'no_show', label: 'No-Show' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id)}
                            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${filter === tab.id
                                ? 'bg-[#033135] !text-white shadow-xs'
                                : 'border border-[#DCE7E3] bg-white text-[#647572] hover:bg-[#FAFBF9]'
                                }`}
                            style={filter === tab.id ? { color: '#ffffff' } : {}}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-[#E8EFEB] text-[#033135]'
                                    }`}
                            >
                                {counts[tab.id] || 0}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA6A0]" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search patient, date, notes..."
                        className="w-full rounded-xl border border-[#DCE7E3] bg-white py-1.5 pl-8 pr-3 text-xs text-[#033135] placeholder:text-[#9AA6A0] outline-none focus:border-[#033135]"
                    />
                </div>
            </div>

            {/* List */}
            {filteredAppointments.length === 0 ? (
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAF7] text-[#9AA6A0]">
                        <FileText size={28} />
                    </div>
                    <h3
                        className="mt-3 text-base font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        No Records Found
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-[#647572]">
                        {searchTerm
                            ? `No records matching "${searchTerm}" in ${filter} consultations.`
                            : `No consultation records found under "${filter}".`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAppointments.map((apt) => (
                        <div
                            key={apt.id}
                            className="rounded-2xl border border-[#E8EFEB] bg-white p-4 sm:p-5 shadow-xs transition hover:border-[#C4D7D4]"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex items-start gap-3.5">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] text-[#033135] font-bold text-sm">
                                        {apt.patientName?.charAt(0) || <User size={18} />}
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-bold text-[#033135]">
                                                {apt.patientName}
                                            </h4>
                                            <span className="text-[11px] text-[#647572]">
                                                ({apt.patientAge} yrs, {apt.patientGender})
                                            </span>
                                            {getStatusBadge(apt.status)}
                                            {apt.phoneConsented && (
                                                <span className="rounded-full bg-[#E4F0EA] px-2 py-0.2 text-[10px] font-semibold text-[#2F7B58]">
                                                    Consented
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-[#647572]">
                                            Chief Complaint: <span className="text-[#033135] font-medium">{apt.notes || 'Routine consultation conducted.'}</span>
                                        </p>

                                        {/* Cancellation Reason Display */}
                                        {apt.status === 'cancelled' && apt.cancellationReason && (
                                            <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs text-[#C0563B]">
                                                <span className="font-bold">Cancellation Reason: </span>
                                                <span>{apt.cancellationReason}</span>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#647572] pt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} className="text-[#648C83]" />
                                                {apt.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} className="text-[#648C83]" />
                                                {apt.time} ({apt.durationMinutes}m)
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Phone size={12} className="text-[#648C83]" />
                                                {apt.patientPhone}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E8EFEB]">
                                    <div className="text-left sm:text-right">
                                        <p className="text-[11px] text-[#647572]">Fee: <strong className="text-sm font-bold text-[#033135]">₹{apt.fee}</strong></p>
                                        <p className="text-[10px] text-[#2F7B58] font-semibold">
                                            {apt.status === 'completed' ? 'Net Payout Credited' : 'No payout accrued'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedAptDetails(apt)}
                                        className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                    >
                                        <Eye size={13} />
                                        <span>Details</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* CLINICAL DETAILS MODAL                                               */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {selectedAptDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-4">
                            <div>
                                <h3 className="text-base font-bold text-[#033135]">
                                    Consultation Clinical Summary
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    Record #{selectedAptDetails.id} · Status: <span className="font-bold uppercase text-[#033135]">{selectedAptDetails.status}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAptDetails(null)}
                                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            {/* Patient Demographics */}
                            <div className="rounded-2xl border border-[#E8EFEB] bg-[#FAFBF9] p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-[#033135]">
                                        {selectedAptDetails.patientName}
                                    </h4>
                                    <span className="rounded-full bg-[#E4F0EA] px-2 py-0.5 text-[10px] font-black text-[#033135]">
                                        {selectedAptDetails.patientAge} YRS · {selectedAptDetails.patientGender}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[#647572]">
                                    <p>Phone: <strong className="text-[#033135]">{selectedAptDetails.patientPhone}</strong></p>
                                    <p>Fee: <strong className="text-[#2F7B58]">₹{selectedAptDetails.fee}</strong></p>
                                    <p>Date: <strong className="text-[#033135]">{selectedAptDetails.date}</strong></p>
                                    <p>Slot: <strong className="text-[#033135]">{selectedAptDetails.time} ({selectedAptDetails.durationMinutes}m)</strong></p>
                                </div>
                            </div>

                            {/* Cancellation Reason if cancelled */}
                            {selectedAptDetails.status === 'cancelled' && selectedAptDetails.cancellationReason && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 space-y-1">
                                    <p className="text-[11px] font-bold text-[#C0563B]">Cancellation Record</p>
                                    <p className="text-xs text-[#033135] font-medium leading-relaxed">
                                        {selectedAptDetails.cancellationReason}
                                    </p>
                                </div>
                            )}

                            {/* User-Shared Health Profile */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                    User-Shared Clinical Profile
                                </h4>

                                {/* Blood Group & Allergies */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white">
                                        <p className="text-[10px] text-[#647572] font-semibold">Blood Group</p>
                                        <p className="text-sm font-black text-[#033135]">
                                            {selectedAptDetails.healthDetails?.bloodGroup || 'Not reported'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-rose-200 p-3 bg-rose-50/40">
                                        <div className="flex items-center gap-1 text-[10px] text-[#C0563B] font-bold">
                                            <AlertTriangle size={11} /> Known Allergies
                                        </div>
                                        <p className="text-xs font-bold text-[#C0563B] mt-0.5">
                                            {selectedAptDetails.healthDetails?.allergies?.join(', ') || 'None reported'}
                                        </p>
                                    </div>
                                </div>

                                {/* Current Medications */}
                                <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#647572] font-bold">
                                        <Pill size={12} className="text-[#648C83]" /> Current Medications
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {selectedAptDetails.healthDetails?.currentMedications?.map((med, i) => (
                                            <span key={i} className="rounded-md bg-[#FAFBF9] border border-[#E8EFEB] px-2 py-0.5 text-[11px] font-medium text-[#033135]">
                                                {med}
                                            </span>
                                        )) || <span className="text-[#9AA6A0] italic">No active medications</span>}
                                    </div>
                                </div>

                                {/* Medical History */}
                                <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#647572] font-bold">
                                        <Activity size={12} className="text-[#648C83]" /> Medical History
                                    </div>
                                    <ul className="list-disc list-inside text-xs text-[#033135] space-y-0.5 mt-1">
                                        {selectedAptDetails.healthDetails?.medicalHistory?.map((h, i) => (
                                            <li key={i}>{h}</li>
                                        )) || <li className="text-[#9AA6A0] italic">None declared</li>}
                                    </ul>
                                </div>

                                {/* Chief Complaint / Clinical Notes */}
                                <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                    <p className="text-[10px] text-[#647572] font-bold">Chief Clinical Complaint / Consultation Goal</p>
                                    <p className="text-xs text-[#033135] leading-relaxed">
                                        {selectedAptDetails.healthDetails?.chiefComplaint || selectedAptDetails.notes || 'General healthcare consultation.'}
                                    </p>
                                </div>

                                {/* Shared Documents */}
                                {selectedAptDetails.healthDetails?.sharedDocuments?.length > 0 && (
                                    <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                        <p className="text-[10px] text-[#647572] font-bold">Attached Medical Records</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {selectedAptDetails.healthDetails.sharedDocuments.map((doc, i) => (
                                                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-[#DCE7E3] bg-[#FAFBF9] px-2.5 py-1 text-[11px] font-medium text-[#033135]">
                                                    <FileText size={12} className="text-[#648C83]" />
                                                    <span>{doc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-6 flex items-center justify-end border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedAptDetails(null)}
                                className="rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
