import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
    Calendar,
    Clock,
    PhoneCall,
    User,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Shield,
    FileText,
    AlertCircle,
    Phone,
    X,
    Activity,
    Pill,
    AlertTriangle,
    Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentProfessional } from '../../../services/professional/professionalAuthService.js'
import {
    getAppointments,
    updateAppointmentStatus,
    getConsultationSettings,
} from '../../../services/professional/professionalConsultationService.js'

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"

const CANCELLATION_REASONS = [
    'Emergency clinical duty at hospital',
    'Doctor on urgent medical leave',
    'Patient requested rescheduling',
    'Mutual cancellation agreement',
    'Technical / Connectivity issue',
    'Other clinical reason',
]

export default function ConsultationAppointments() {
    const { professional: contextProf } = useOutletContext() || {}
    const [professional, setProfessional] = useState(contextProf || null)
    const [appointments, setAppointments] = useState([])
    const [settings, setSettings] = useState(null)

    // Modals
    const [selectedAptDetails, setSelectedAptDetails] = useState(null)
    const [cancellingApt, setCancellingApt] = useState(null)
    const [cancellationReason, setCancellationReason] = useState(CANCELLATION_REASONS[0])
    const [cancellationNote, setCancellationNote] = useState('')
    const [callConfirmApt, setCallConfirmApt] = useState(null)

    const loadData = () => {
        const prof = contextProf || getCurrentProfessional()
        if (prof?.id) {
            setProfessional(prof)
            const upcoming = getAppointments(prof.id, { status: 'upcoming' })
            setAppointments(upcoming)
            setSettings(getConsultationSettings(prof.id))
        }
    }

    useEffect(() => {
        loadData()
    }, [contextProf])

    // Status updates
    const handleStatusChange = (aptId, newStatus, reason = null) => {
        if (!professional?.id) return
        const res = updateAppointmentStatus(aptId, professional.id, newStatus, reason)
        if (res.success) {
            toast.success(
                newStatus === 'cancelled'
                    ? 'Appointment cancelled. Slot released to Available on calendar.'
                    : `Appointment marked as ${newStatus}`
            )
            loadData()
            setCancellingApt(null)
        } else {
            toast.error(res.error || 'Failed to update appointment.')
        }
    }

    // Direct phone dialler action (using device's phone dialler)
    const handleDirectDial = (phone) => {
        if (!phone) {
            toast.error('No phone number provided.')
            return
        }
        window.location.href = `tel:${phone}`
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
                        <span className="text-[#033135]">Appointments</span>
                    </div>
                    <h1
                        className="mt-1 text-2xl sm:text-3xl font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        Upcoming Appointments ({appointments.length})
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#647572]">
                        Confirmed patient bookings with user-consented contact details, shared health records, and direct calling.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/professional/consultations/history"
                        className="rounded-xl border border-[#DCE7E3] bg-white px-4 py-2 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                    >
                        View Past History
                    </Link>
                    <Link
                        to="/professional/consultations/schedule"
                        className="rounded-xl bg-[#033135] px-4 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition shadow-xs inline-block"
                        style={{ color: '#ffffff' }}
                    >
                        Availability Calendar
                    </Link>
                </div>
            </div>

            {/* Calling Telephony Security Note */}
            <div className="flex items-start gap-3 rounded-2xl border border-[#DCE7E3] bg-[#E4F0EA]/40 p-4 text-xs text-[#033135]">
                <Shield size={18} className="shrink-0 text-[#2F7B58] mt-0.5" />
                <div className="space-y-1">
                    <p className="font-bold">
                        User Consent & Direct Calling
                    </p>
                    <p className="text-[#324C4D] leading-relaxed">
                        Patients have explicitly consented to receive phone consultation calls at their registered numbers during their scheduled slots. Use the <strong>Call User</strong> button to connect directly via your device dialler.
                    </p>
                </div>
            </div>

            {/* Appointments List */}
            {appointments.length === 0 ? (
                <div className="rounded-2xl border border-[#E8EFEB] bg-white p-12 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F8FAF7] text-[#9AA6A0]">
                        <Calendar size={32} />
                    </div>
                    <h3
                        className="mt-4 text-lg font-bold text-[#033135]"
                        style={{ fontFamily: SERIF }}
                    >
                        No Upcoming Appointments
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-[#647572]">
                        You currently have no scheduled consultations. Newly booked appointments will appear here automatically.
                    </p>
                    <div className="mt-5">
                        <Link
                            to="/professional/consultations/schedule"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2.5 text-xs font-bold !text-white hover:bg-[#324C4D] transition shadow-xs"
                            style={{ color: '#ffffff' }}
                        >
                            <Clock size={14} />
                            <span>Check Availability Calendar</span>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {appointments.map((apt) => (
                        <div
                            key={apt.id}
                            className="rounded-2xl border border-[#E8EFEB] bg-white p-5 shadow-xs transition hover:border-[#C4D7D4]"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                {/* Patient Info & Details */}
                                <div className="flex items-start gap-3.5">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135] font-bold text-sm">
                                        {apt.patientName?.charAt(0) || 'P'}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-[#033135]">
                                                {apt.patientName}
                                            </h3>
                                            <span className="text-[11px] text-[#647572]">
                                                ({apt.patientAge} yrs, {apt.patientGender})
                                            </span>
                                            <span className="rounded-full bg-[#E4F0EA] px-2 py-0.5 text-[10px] font-black text-[#033135] uppercase">
                                                {apt.status}
                                            </span>
                                            {apt.phoneConsented && (
                                                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#2F7B58]/10 text-[#2F7B58] px-2 py-0.5 text-[10px] font-bold">
                                                    <CheckCircle2 size={10} /> Phone Consented
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-[#647572]">
                                            Chief Complaint: <span className="font-medium text-[#324C4D]">{apt.notes || 'Routine consultation'}</span>
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#647572] pt-1">
                                            <span className="flex items-center gap-1 font-semibold text-[#033135]">
                                                <Calendar size={13} className="text-[#648C83]" />
                                                {apt.date}
                                            </span>
                                            <span className="flex items-center gap-1 font-semibold text-[#033135]">
                                                <Clock size={13} className="text-[#648C83]" />
                                                {apt.time} ({apt.durationMinutes} mins)
                                            </span>
                                            <span className="flex items-center gap-1 text-[#033135] font-bold">
                                                <Phone size={12} className="text-[#648C83]" />
                                                {apt.phoneConsented ? apt.patientPhone : 'Number Hidden (No Consent)'}
                                            </span>
                                            <span className="font-bold text-[#2F7B58]">
                                                Fee: ₹{apt.fee}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-2 shrink-0">
                                    <div className="flex items-center gap-2">
                                        {/* View Details */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedAptDetails(apt)}
                                            className="flex items-center gap-1 rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-1.5 text-xs font-semibold text-[#033135] hover:bg-[#E4F0EA] transition"
                                        >
                                            <Eye size={13} />
                                            <span>Details</span>
                                        </button>

                                        {/* Call User Button */}
                                        <button
                                            type="button"
                                            onClick={() => setCallConfirmApt(apt)}
                                            disabled={!apt.phoneConsented}
                                            className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-4 py-1.5 text-xs font-bold !text-white shadow-xs hover:bg-[#324C4D] transition disabled:opacity-40"
                                            style={{ color: '#ffffff' }}
                                        >
                                            <PhoneCall size={13} />
                                            <span>Call User</span>
                                        </button>
                                    </div>

                                    {/* Secondary Status Actions */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleStatusChange(apt.id, 'completed')}
                                            className="rounded-lg border border-[#DCE7E3] bg-[#FAFBF9] px-2.5 py-1 text-[11px] font-semibold text-[#2F7B58] hover:bg-[#E4F0EA] transition"
                                        >
                                            Completed
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleStatusChange(apt.id, 'no_show')}
                                            className="rounded-lg border border-[#DCE7E3] bg-[#FAFBF9] px-2.5 py-1 text-[11px] font-semibold text-[#8B6D25] hover:bg-amber-50 transition"
                                        >
                                            No-Show
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCancellingApt(apt)}
                                            className="rounded-lg border border-[#DCE7E3] bg-[#FAFBF9] px-2.5 py-1 text-[11px] font-semibold text-[#C0563B] hover:bg-rose-50 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 1: APPOINTMENT CLINICAL DETAILS MODAL                           */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {selectedAptDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-4">
                            <div>
                                <h3 className="text-base font-bold text-[#033135]">
                                    Appointment Details & Health Profile
                                </h3>
                                <p className="text-xs text-[#647572]">
                                    Booking #{selectedAptDetails.id}
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
                                    <p>Phone: <strong className="text-[#033135]">{selectedAptDetails.phoneConsented ? selectedAptDetails.patientPhone : 'Hidden'}</strong></p>
                                    <p>Fee: <strong className="text-[#2F7B58]">₹{selectedAptDetails.fee} Confirmed</strong></p>
                                    <p>Date: <strong className="text-[#033135]">{selectedAptDetails.date}</strong></p>
                                    <p>Slot: <strong className="text-[#033135]">{selectedAptDetails.time} ({selectedAptDetails.durationMinutes}m)</strong></p>
                                </div>
                            </div>

                            {/* User-Shared Health Profile */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#324C4D]">
                                    User-Shared Health Information
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

                                {/* Chief Complaint / Notes */}
                                <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                    <p className="text-[10px] text-[#647572] font-bold">Chief Clinical Complaint / Consultation Goal</p>
                                    <p className="text-xs text-[#033135] leading-relaxed">
                                        {selectedAptDetails.healthDetails?.chiefComplaint || selectedAptDetails.notes || 'General healthcare consultation.'}
                                    </p>
                                </div>

                                {/* Shared Documents */}
                                {selectedAptDetails.healthDetails?.sharedDocuments?.length > 0 && (
                                    <div className="rounded-xl border border-[#E8EFEB] p-3 bg-white space-y-1">
                                        <p className="text-[10px] text-[#647572] font-bold">User-Attached Medical Records</p>
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
                        <div className="mt-6 flex items-center justify-between border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedAptDetails(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572] hover:bg-[#FAFBF9]"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedAptDetails(null)
                                    setCallConfirmApt(selectedAptDetails)
                                }}
                                disabled={!selectedAptDetails.phoneConsented}
                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition disabled:opacity-40"
                                style={{ color: '#ffffff' }}
                            >
                                <PhoneCall size={13} />
                                <span>Call Patient Now</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 2: CALL CONFIRMATION (Using Device Phone Dialler)              */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {callConfirmApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4F0EA] text-[#033135]">
                                    <PhoneCall size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Call {callConfirmApt.patientName}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCallConfirmApt(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 space-y-3 text-xs">
                            <div className="rounded-xl bg-[#FAFBF9] border border-[#E8EFEB] p-3 space-y-1">
                                <p className="text-[#647572]">Patient Phone: <strong className="text-[#033135] font-mono text-sm">{callConfirmApt.patientPhone}</strong></p>
                                <p className="text-[#647572]">Slot: <strong>{callConfirmApt.date} at {callConfirmApt.time}</strong></p>
                            </div>

                            <p className="text-[#647572] leading-relaxed">
                                Clicking "Open Device Dialler" will trigger your phone dialler with the patient's consented phone number pre-filled.
                            </p>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setCallConfirmApt(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleDirectDial(callConfirmApt.patientPhone)
                                    setCallConfirmApt(null)
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-[#033135] px-5 py-2 text-xs font-bold !text-white hover:bg-[#324C4D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                <PhoneCall size={14} />
                                <span>Open Device Dialler</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 3: CANCELLATION MODAL WITH CLINICAL REASON                     */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {cancellingApt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#E8EFEB] pb-3">
                            <div className="flex items-center gap-2 text-[#C0563B]">
                                <XCircle size={18} />
                                <h3 className="text-sm font-bold text-[#033135]">
                                    Cancel Appointment
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCancellingApt(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            <p className="text-[#647572]">
                                You are cancelling the appointment with <strong>{cancellingApt.patientName}</strong> on <strong>{cancellingApt.date} ({cancellingApt.time})</strong>.
                            </p>

                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-[11px]">
                                ℹ️ <strong>Availability Sync:</strong> Cancelling this appointment will automatically release this slot back to <strong>Available</strong> on your calendar.
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-[#324C4D] mb-1">
                                    Reason for Cancellation *
                                </label>
                                <select
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-2 text-xs font-semibold text-[#033135] outline-none"
                                >
                                    {CANCELLATION_REASONS.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-[#324C4D] mb-1">
                                    Additional Clinical Note (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={cancellationNote}
                                    onChange={(e) => setCancellationNote(e.target.value)}
                                    placeholder="Brief note on reschedule timing or explanation..."
                                    className="w-full rounded-xl border border-[#DCE7E3] bg-[#FAFBF9] px-3 py-2 text-xs outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#E8EFEB] pt-4">
                            <button
                                type="button"
                                onClick={() => setCancellingApt(null)}
                                className="rounded-xl border border-[#DCE7E3] px-4 py-2 text-xs font-semibold text-[#647572]"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const fullReason = cancellationNote.trim()
                                        ? `${cancellationReason} - ${cancellationNote.trim()}`
                                        : cancellationReason
                                    handleStatusChange(cancellingApt.id, 'cancelled', fullReason)
                                }}
                                className="rounded-xl bg-[#C0563B] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#A8452D] transition"
                                style={{ color: '#ffffff' }}
                            >
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
