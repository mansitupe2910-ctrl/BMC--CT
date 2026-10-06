import React, { useState, useRef } from 'react';
import { Complaint, FieldEngineerUser, Language } from '../../types';
import { getTranslation, getComplaintTitle } from '../../utils/translations';
import { CivicPhotoDisplay } from '../CivicPhotoDisplay';
import confetti from 'canvas-confetti';
import {
  HardHat,
  Search,
  Camera,
  Upload,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  FileCheck,
  ArrowRight,
  Sparkles,
  RefreshCw,
  User,
  Wrench,
  Check,
  CheckSquare,
  ShieldCheck,
  Compass,
  Filter,
  Eye,
  X,
  Layers
} from 'lucide-react';

interface FieldEngineerPortalProps {
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  engineerUser: FieldEngineerUser;
  language: Language;
  onLogout?: () => void;
}

const PRESET_WORK_PHOTOS = [
  {
    id: 'repair-asphalt-compaction',
    titleEn: 'Asphalt Cold-Mix Compaction (रस्ता डांबरीकरण)',
    titleMr: 'रस्ता डांबरीकरण व रोलर सपाटीकरण',
    stage: 'after_repair' as const,
  },
  {
    id: 'scen-pothole',
    titleEn: 'Base Excavation & Tack Coat (पाया खोदकाम)',
    titleMr: 'खड्ड्याची स्वच्छता व प्रायमर कोट',
    stage: 'during_work' as const,
  },
  {
    id: 'scen-waterlogging',
    titleEn: 'SWD Drain Desilted & Flow Restored (नाले सफाई)',
    titleMr: 'पावसाळी गटार सफाई व पाणी निचरा पूर्ण',
    stage: 'after_repair' as const,
  },
  {
    id: 'scen-garbage',
    titleEn: 'Garbage Dump Cleared & Disinfected (कचरा निर्मूलन)',
    titleMr: 'कचरा उचलून निर्जंतुकीकरण पूर्ण',
    stage: 'after_repair' as const,
  },
  {
    id: 'scen-wire',
    titleEn: 'Electrical Hazard Sealed & Insulated (वीज सुरक्षा)',
    titleMr: 'विद्युत तारांची दुरुस्ती व सुरक्षित केबलिंग',
    stage: 'after_repair' as const,
  },
];

export const FieldEngineerPortal: React.FC<FieldEngineerPortalProps> = ({
  complaints,
  setComplaints,
  engineerUser,
  language,
  onLogout,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'ward' | 'pending' | 'submitted' | 'resolved'>('all');
  const [ticketSearchInput, setTicketSearchInput] = useState<string>('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchError, setSearchError] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  // Work Done Form State
  const [workPhotoUrl, setWorkPhotoUrl] = useState<string>('repair-asphalt-compaction');
  const [workPhotoCaption, setWorkPhotoCaption] = useState<string>('Final cold-mix asphalt patch leveled and compacted with roller');
  const [workTimestamp, setWorkTimestamp] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }) + ' IST';
  });
  const [workLocationTag, setWorkLocationTag] = useState<string>('');
  const [workNotes, setWorkNotes] = useState<string>(
    'Pothole excavated to rectangular boundaries, 25kg IRC-grade polymer cold-mix applied and vibratory roller compacted to grade. No debris remaining.'
  );
  const [workerTeamLeader, setWorkerTeamLeader] = useState<string>('Babu Kadam & Squad 4');
  const [isCapturingGps, setIsCapturingGps] = useState<boolean>(false);
  const [customUploadedImage, setCustomUploadedImage] = useState<string | null>(null);

  const workDeskRef = useRef<HTMLDivElement>(null);

  // Filter complaints based on tab
  const filteredComplaints = complaints.filter((c) => {
    if (filterTab === 'ward') {
      return c.wardId === engineerUser.assignedWard;
    }
    if (filterTab === 'pending') {
      return c.status === 'in_progress' || c.status === 'new';
    }
    if (filterTab === 'submitted') {
      return c.status === 'verification_pending';
    }
    if (filterTab === 'resolved') {
      return c.status === 'resolved';
    }
    return true;
  });

  // Tap on a complaint to open work execution workspace
  const handleSelectComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setSearchError('');
    setSuccessToast('');

    // Prepopulate GPS tag from complaint address & coordinates
    setWorkLocationTag(
      complaint.locationAddress
        ? `${complaint.lat?.toFixed(4) || '19.1197'}° N, ${complaint.lng?.toFixed(4) || '72.8464'}° E (${complaint.locationAddress})`
        : `${complaint.lat?.toFixed(4) || '19.1197'}° N, ${complaint.lng?.toFixed(4) || '72.8464'}° E`
    );

    // Refresh timestamp
    handleRefreshTimestamp();

    // Smooth scroll to work desk
    setTimeout(() => {
      workDeskRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Search for complaint by ticket number or ID
  const handleSearchComplaint = (ticketToSearch?: string) => {
    const query = (ticketToSearch || ticketSearchInput).trim().toLowerCase();
    setSearchError('');
    setSuccessToast('');

    if (!query) {
      setSearchError(
        language === 'mr'
          ? 'कृपया वैध तक्रार / तिकीट क्रमांक प्रविष्ट करा (उदा. BMC-2026-9101 किंवा 9101)'
          : 'Please enter a valid ticket number (e.g. BMC-2026-9101 or 9101)'
      );
      return;
    }

    const matched = complaints.find((c) => {
      const t = (c.ticketNumber || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      return (
        t === query ||
        id === query ||
        t.endsWith(query) ||
        t.replace(/\D/g, '').endsWith(query.replace(/\D/g, ''))
      );
    });

    if (matched) {
      handleSelectComplaint(matched);
    } else {
      setSelectedComplaint(null);
      setSearchError(
        language === 'mr'
          ? `तक्रार क्रमांक "${query}" सापडला नाही. कृपया बरोबर तिकीट क्रमांक टाका किंवा खालील यादीतून निवडा.`
          : `Complaint ticket "${query}" was not found. Please verify the ticket number or tap from complaints list below.`
      );
    }
  };

  // Refresh Timestamp to current time
  const handleRefreshTimestamp = () => {
    const now = new Date();
    const formatted =
      now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ' IST';
    setWorkTimestamp(formatted);
  };

  // Capture Live GPS Coordinates
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturingGps(false);
        const { latitude, longitude } = pos.coords;
        const baseAddress = selectedComplaint?.locationAddress || 'Site Carriageway, Mumbai';
        setWorkLocationTag(`${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E (${baseAddress})`);
      },
      (err) => {
        setIsCapturingGps(false);
        console.warn('GPS error, using site fallback coordinates:', err.message);
        if (selectedComplaint) {
          setWorkLocationTag(`${selectedComplaint.lat}° N, ${selectedComplaint.lng}° E (${selectedComplaint.locationAddress})`);
        }
      },
      { timeout: 8000 }
    );
  };

  // Handle custom image file upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomUploadedImage(result);
        setWorkPhotoUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Work Done to the Complaint
  const handleSubmitWorkDone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const finalPhoto = customUploadedImage || workPhotoUrl || 'repair-asphalt-compaction';
    const finalTimestamp = workTimestamp || new Date().toLocaleString() + ' IST';
    const finalLocationTag =
      workLocationTag ||
      `${selectedComplaint.lat || 19.1197}° N, ${selectedComplaint.lng || 72.8464}° E (${selectedComplaint.locationAddress})`;

    const updatedProof = {
      repairPhotoUrl: finalPhoto,
      submittedAt: finalTimestamp,
      engineerName: engineerUser.name,
      engineerId: engineerUser.engineerId, // PROMINENT ENGINEER ID E101
      locationTag: finalLocationTag, // GEOTAGGED LOCATION
      timestamp: finalTimestamp, // EXACT TIMESTAMP
      supervisorName: 'Shri Ramesh Parab (Site Supervisor)',
      workerTeam: workerTeamLeader || 'Ward Maintenance Crew',
      structuralIntegrityScore: 95,
      debrisClearanceScore: 98,
      surfaceSmoothnessScore: 94,
      overallMatchScore: 96,
      passed: true,
      notes: {
        en: workNotes,
        mr: workNotes,
        hi: workNotes,
      },
      repairPhotos: [
        {
          id: `proof-${Date.now()}`,
          url: finalPhoto,
          caption: workPhotoCaption || 'Field Work Completed & Quality Verified',
          stage: 'after_repair' as const,
          uploadedBy: `${engineerUser.name} (ID: ${engineerUser.engineerId})`,
          role: 'Junior Engineer' as const,
          timestamp: finalTimestamp,
        },
      ],
    };

    const newActivity = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: {
        en: `Field Engineer ${engineerUser.engineerId} uploaded completed work photo with GPS & timestamp tags`,
        mr: `क्षेत्रीय अभियंता ${engineerUser.engineerId} यांनी काम पूर्ण झाल्याचा फोटो, GPS स्थान व वेळेसह जोडला`,
        hi: `फील्ड इंजीनियर ${engineerUser.engineerId} ने काम पूर्ण होने का फोटो GPS व समय सहित दर्ज किया`,
      },
      actor: `Er. ${engineerUser.name} (${engineerUser.engineerId})`,
    };

    const updatedComplaints = complaints.map((c) => {
      if (c.id === selectedComplaint.id) {
        return {
          ...c,
          status: 'verification_pending' as const, // Awaiting adhikari cross-verification
          proofOfWork: updatedProof,
          activityLog: [newActivity, ...(c.activityLog || [])],
        };
      }
      return c;
    });

    setComplaints(updatedComplaints);

    // Save to localStorage & backend API
    try {
      localStorage.setItem('bmc_saved_complaints', JSON.stringify(updatedComplaints));
      fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedComplaints),
      }).catch(() => {});
    } catch {}

    try {
      confetti({ particleCount: 70, spread: 80 });
    } catch {}

    const successMsg =
      language === 'mr'
        ? `तक्रार #${selectedComplaint.ticketNumber} चे काम यशस्वीरीत्या जमा झाले! आता वॉर्ड अधिकारी (अधिकारी) "Validate Proof" वरून या पुराव्याची समोरासमोर क्रॉस-पडताळणी करतील.`
        : `Work done photo for Ticket #${selectedComplaint.ticketNumber} submitted successfully by Engineer ${engineerUser.engineerId}! Awaiting Adhikari cross-verification via Validate Proof.`;

    setSuccessToast(successMsg);
    // Refresh active complaint view
    const refreshed = updatedComplaints.find((c) => c.id === selectedComplaint.id) || null;
    setSelectedComplaint(refreshed);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 text-slate-800 space-y-6 text-left">
      {/* 1. Field Engineer Header Profile Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 border-l-4 border-amber-500 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 text-slate-900 flex items-center justify-center font-black rounded-none shadow-sm border border-amber-400 shrink-0">
            <HardHat className="w-7 h-7 text-slate-900" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {engineerUser.name}
              </h1>
              <span className="bg-amber-400 text-slate-950 font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-none border border-amber-300">
                ID: {engineerUser.engineerId}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2 py-0.5 rounded-none flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                {language === 'mr' ? 'कार्यस्थळावर सक्रिय (Field Duty Active)' : 'Active On Site Duty'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {engineerUser.designation} · {language === 'mr' ? `अधिकार क्षेत्र: वॉर्ड ${engineerUser.assignedWard}` : `Ward: ${engineerUser.assignedWard}`} · {engineerUser.department}
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 rounded-none cursor-pointer transition-colors shadow-2xs self-end md:self-auto"
          >
            {language === 'mr' ? 'बाहेर पडा (Log Out)' : 'Switch / Log Out'}
          </button>
        )}
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-600 text-emerald-950 text-xs sm:text-sm font-bold flex items-start gap-3 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p>{successToast}</p>
            <span className="text-[11px] font-semibold text-emerald-800 block mt-1">
              {language === 'mr'
                ? 'वॉर्ड अधिकारी (अधिकारी) त्यांच्या डॅशबोर्डवर "कामाची पडताळणी" (Validate Proof) वर क्लिक करून नागरिकाचा मूळ फोटो आणि आपल्या कामाचा फोटो समोरासमोर तपासून मंजुरी देतील.'
                : 'The Ward Officer (Adhikari) will cross-verify your photo against the citizen’s incident photo simultaneously with your Engineer ID.'}
            </span>
          </div>
        </div>
      )}

      {/* 2. Search by Ticket Number + Quick Instructions */}
      <div className="bg-white border-2 border-slate-300 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              {language === 'mr'
                ? 'तक्रार क्रमांक शोधा किंवा खालील यादीतून निवडा (Search Ticket):'
                : 'Find Ticket or Select from Complaints Below:'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {language === 'mr'
                ? 'आपण काम पूर्ण केलेल्या कोणत्याही तक्रारीवर टॅप करून पूर्ण कामाचे छायाचित्र अपलोड करू शकता.'
                : 'Tap any complaint below to open the work completion desk and upload photos with GPS/timestamp tags.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 border border-amber-300">
              {filteredComplaints.length} {language === 'mr' ? 'तक्रारी उपलब्ध' : 'Tickets Available'}
            </span>
          </div>
        </div>

        {/* Input Bar & Search Button */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={ticketSearchInput}
              onChange={(e) => setTicketSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchComplaint()}
              placeholder={
                language === 'mr'
                  ? 'तक्रार क्रमांक टाका (उदा. BMC-2026-9101 किंवा 9101)...'
                  : 'Enter Ticket Number (e.g. BMC-2026-9101 or 9101)...'
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-none text-slate-900 font-mono text-sm font-bold focus:bg-white focus:border-amber-600 focus:outline-hidden"
            />
            <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
              TICKET #
            </div>
          </div>

          <button
            onClick={() => handleSearchComplaint()}
            type="button"
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-slate-950 font-black text-xs sm:text-sm rounded-none border border-amber-700 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Search className="w-4 h-4" />
            <span>{language === 'mr' ? 'शोधा (Find)' : 'Find Ticket'}</span>
          </button>
        </div>

        {searchError && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* 3. ACTIVE WORK DONE DESK (IF COMPLAINT IS SELECTED) */}
      {selectedComplaint && (
        <div ref={workDeskRef} className="bg-white border-3 border-emerald-600 shadow-xl p-4 sm:p-6 space-y-6 animate-in fade-in">
          {/* Header of Active Complaint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-slate-900 text-white font-mono text-xs font-black px-2.5 py-0.5 rounded-none">
                  #{selectedComplaint.ticketNumber}
                </span>
                <span className="bg-emerald-100 text-emerald-900 font-bold text-xs px-2 py-0.5 rounded-none border border-emerald-300">
                  {language === 'mr' ? 'वॉर्ड:' : 'Ward:'} {selectedComplaint.wardName || selectedComplaint.wardId}
                </span>
                <span className="bg-amber-100 text-amber-900 font-bold text-xs px-2 py-0.5 rounded-none">
                  {selectedComplaint.category.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedComplaint.reportedAt}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5">
                {getComplaintTitle(selectedComplaint, language)}
              </h3>
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{selectedComplaint.locationAddress}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className={`inline-block font-bold text-xs px-3 py-1.5 uppercase rounded-none border ${
                selectedComplaint.status === 'verification_pending'
                  ? 'bg-purple-600 text-white border-purple-700'
                  : selectedComplaint.status === 'resolved'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-amber-500 text-slate-950 border-amber-600'
              }`}>
                {selectedComplaint.status === 'verification_pending'
                  ? (language === 'mr' ? 'अधिकारी पडताळणी प्रलंबित' : 'Awaiting Adhikari Verification')
                  : selectedComplaint.status === 'resolved'
                  ? (language === 'mr' ? 'निकाली' : 'Resolved')
                  : (language === 'mr' ? 'काम बाकी (In Progress)' : 'In Progress')}
              </span>

              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-none cursor-pointer"
                title="Close desk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* DUAL COMPARISON: Citizen's Original Issue (BEFORE) vs Work Done Photo (AFTER) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Pane: Citizen's Original Report (BEFORE) */}
            <div className="space-y-2 border-2 border-rose-200 p-3.5 bg-rose-50/30">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800 border-b border-rose-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-600 rounded-none inline-block"></span>
                  <span>{language === 'mr' ? '१. नागरिकांची मूळ तक्रार (BEFORE PHOTO)' : '1. BEFORE: Citizen Incident Photo'}</span>
                </span>
                <span className="text-[10px] text-slate-500">{selectedComplaint.reportedAt}</span>
              </div>

              <CivicPhotoDisplay
                type={selectedComplaint.photoUrl}
                className="aspect-16/10 w-full rounded-none border border-rose-300 shadow-2xs"
              />

              <div className="text-xs text-slate-700 space-y-1 pt-1 bg-white p-2.5 border border-rose-100">
                <p>
                  <strong>{language === 'mr' ? 'स्थान:' : 'Location:'}</strong> {selectedComplaint.locationAddress}
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>{language === 'mr' ? 'नागरिकांचा संदेश:' : 'Citizen Description:'}</strong> {selectedComplaint.description[language] || selectedComplaint.description.en}
                </p>
              </div>
            </div>

            {/* Right Pane: Work Done Preview (AFTER) */}
            <div className="space-y-2 border-3 border-emerald-600 p-3.5 bg-emerald-50/50">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950 border-b border-emerald-300 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{language === 'mr' ? '२. पूर्ण कामाचा फोटो (AFTER: COMPLETED WORK)' : '2. AFTER: Completed Work Photo'}</span>
                </span>
                <span className="font-mono text-xs bg-emerald-800 text-white px-2 py-0.5 rounded-none font-black">
                  ID: {engineerUser.engineerId}
                </span>
              </div>

              <CivicPhotoDisplay
                type={customUploadedImage || workPhotoUrl}
                isProofOfWorkRepair={true}
                className="aspect-16/10 w-full rounded-none border-2 border-emerald-600 shadow-xs"
              />

              <div className="text-xs bg-white p-2.5 border border-emerald-300 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800">
                    {language === 'mr' ? 'क्षेत्रीय अभियंता:' : 'Field Engineer:'} <strong className="text-emerald-800 font-mono">{engineerUser.name} ({engineerUser.engineerId})</strong>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">{workTimestamp}</span>
                </div>
                <div className="text-[11px] text-slate-700 truncate">
                  <strong className="text-emerald-900">GPS Site Tag:</strong> {workLocationTag || 'Coordinates attached'}
                </div>
              </div>
            </div>
          </div>

          {/* Form to Configure & Add Work Done with Timestamp and Location Tag */}
          <form onSubmit={handleSubmitWorkDone} className="bg-slate-50 border-2 border-slate-300 p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-black text-slate-900">
                  {language === 'mr' ? 'पूर्ण कामाचे छायाचित्र व माहिती जोडा (Work Done Details & Tags):' : 'Upload Completed Work Photo & Tags:'}
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 border border-emerald-300">
                Engineer: {engineerUser.engineerId}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Choose from realistic repair preset photos OR upload custom */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {language === 'mr' ? '१. पूर्ण कामाचा फोटो निवडा / कॅमेरा फोटो (Work Photo)*:' : '1. Completed Work Photo (Camera or Preset)*:'}
                </label>
                
                {/* File Upload Button */}
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex-1 px-3 py-2.5 bg-white border-2 border-dashed border-slate-400 hover:border-emerald-600 text-xs font-bold text-slate-700 rounded-none cursor-pointer flex items-center justify-center gap-2 shadow-2xs">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'mr' ? 'डिव्हाईसवरून फोटो निवडा (Upload Photo)' : 'Upload Photo From Device'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  {customUploadedImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUploadedImage(null);
                        setWorkPhotoUrl('repair-asphalt-compaction');
                      }}
                      className="text-[11px] text-rose-600 hover:underline font-bold px-2 py-1"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Preset Options */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    {language === 'mr' ? 'किंवा अधिकृत मनपा दुरुस्ती छायाचित्र निवडा:' : 'Or Select Municipal Standard Work Photo:'}
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {PRESET_WORK_PHOTOS.map((p) => {
                      const isSelected = workPhotoUrl === p.id && !customUploadedImage;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setCustomUploadedImage(null);
                            setWorkPhotoUrl(p.id);
                            setWorkPhotoCaption(language === 'mr' ? p.titleMr : p.titleEn);
                          }}
                          className={`px-2.5 py-1.5 border text-left text-xs rounded-none cursor-pointer transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{language === 'mr' ? p.titleMr : p.titleEn}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Timestamp and Location Tag Controls */}
              <div className="space-y-3">
                {/* 2. TIMESTAMP TAG */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{language === 'mr' ? '२. काम पूर्ण झाल्याची वेळ (Exact Timestamp)*:' : '2. Work Completion Timestamp*:'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRefreshTimestamp}
                      className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>{language === 'mr' ? 'आत्ताची वेळ समक्रमित करा' : 'Sync Live Time'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={workTimestamp}
                    onChange={(e) => setWorkTimestamp(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 font-mono text-xs font-bold text-slate-900 rounded-none focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* 3. LOCATION TAG */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{language === 'mr' ? '३. घटनास्थळ / GPS नोंद (GPS Site Tag)*:' : '3. Site GPS & Location Tag*:'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGetLiveLocation}
                      disabled={isCapturingGps}
                      className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Compass className={`w-2.5 h-2.5 ${isCapturingGps ? 'animate-spin' : ''}`} />
                      <span>{isCapturingGps ? 'GPS शोधत आहे...' : (language === 'mr' ? 'थेट डिव्हाईस GPS घ्या' : 'Get Device GPS')}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={workLocationTag}
                    onChange={(e) => setWorkLocationTag(e.target.value)}
                    placeholder="उदा. 19.1197° N, 72.8464° E (SV Road, Near Shoppers Stop)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 font-mono text-xs font-semibold text-slate-900 rounded-none focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* 4. WORK DESCRIPTION / NOTES */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {language === 'mr' ? '४. वापरलेले साहित्य व तपशील (Work Notes & Materials):' : '4. Work Notes & Materials Used:'}
                  </label>
                  <textarea
                    rows={2}
                    value={workNotes}
                    onChange={(e) => setWorkNotes(e.target.value)}
                    placeholder="उदा. डांबरी पॅच भरून रोलरने दाबले, रस्ता वाहतुकीसाठी पूर्ववत सुरू केला..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-xs text-slate-800 rounded-none focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-800">
                  {language === 'mr' ? 'अधिकारी पडताळणी सूचना:' : 'Adhikari Cross-Verification Flow:'}
                </span>{' '}
                {language === 'mr'
                  ? `आपण सबमिट केल्यानंतर वॉर्ड अधिकारी (अधिकारी) समोरासमोर (Simultaneously) दोन्ही फोटो आणि आपला अभियंता आयडी (${engineerUser.engineerId}) तपासून तिकीट पूर्ण करतील.`
                  : `Upon submission, the Adhikari will cross-verify Before vs After photos simultaneously with Engineer ID (${engineerUser.engineerId}) to validate resolution.`}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-none border border-emerald-800 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>
                  {language === 'mr'
                    ? `कामाचा पुरावा सादर करा (Submit Work Done for Adhikari)`
                    : `Submit Work Done (Engineer ID ${engineerUser.engineerId})`}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. COMPLAINTS LIST / FEED WHERE FIELD ENGINEER LANDS & CAN TAP ANY COMPLAINT */}
      <div className="bg-white border-2 border-slate-300 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Section Title & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {language === 'mr'
                  ? 'सर्व तक्रारींची यादी (Tap Any Complaint to Upload Completed Work):'
                  : 'Site Complaints Feed (Tap Any Complaint to Upload Work Done):'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'mr'
                ? 'खालील कोणत्याही तक्रारीवर टॅप करा; त्याचे काम पूर्ण झाल्यावर फोटो, वेळ व स्थान जोडून सादर करा.'
                : 'Tap any ticket below to inspect details and upload the completed work photograph for Adhikari cross-verification.'}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 font-bold rounded-none border cursor-pointer whitespace-nowrap transition-colors ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {language === 'mr' ? 'सर्व तक्रारी' : 'All'} ({complaints.length})
            </button>

            <button
              onClick={() => setFilterTab('ward')}
              className={`px-3 py-1 font-bold rounded-none border cursor-pointer whitespace-nowrap transition-colors ${
                filterTab === 'ward'
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {language === 'mr' ? `वॉर्ड ${engineerUser.assignedWard}` : `Ward ${engineerUser.assignedWard}`}
            </button>

            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1 font-bold rounded-none border cursor-pointer whitespace-nowrap transition-colors ${
                filterTab === 'pending'
                  ? 'bg-amber-600 text-slate-950 border-amber-700 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {language === 'mr' ? 'काम बाकी' : 'Pending Work'}
            </button>

            <button
              onClick={() => setFilterTab('submitted')}
              className={`px-3 py-1 font-bold rounded-none border cursor-pointer whitespace-nowrap transition-colors ${
                filterTab === 'submitted'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {language === 'mr' ? 'पडताळणी प्रलंबित' : 'Proof Submitted'}
            </button>

            <button
              onClick={() => setFilterTab('resolved')}
              className={`px-3 py-1 font-bold rounded-none border cursor-pointer whitespace-nowrap transition-colors ${
                filterTab === 'resolved'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {language === 'mr' ? 'अधिकारी मंजूर' : 'Approved'}
            </button>
          </div>
        </div>

        {/* Complaints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredComplaints.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-slate-50 border border-slate-200 text-slate-500">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-sm">
                {language === 'mr' ? 'या फिल्टरमध्ये कोणतीही तक्रार आढळली नाही' : 'No complaints found under this filter'}
              </p>
            </div>
          ) : (
            filteredComplaints.map((item) => {
              const isSelected = selectedComplaint?.id === item.id;
              const hasProof = !!item.proofOfWork;
              const isPendingVerification = item.status === 'verification_pending';
              const isResolved = item.status === 'resolved';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectComplaint(item)}
                  className={`p-3.5 border-2 rounded-none cursor-pointer transition-all flex flex-col justify-between text-left group shadow-xs ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-md'
                      : 'border-slate-300 bg-white hover:border-amber-500 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Ticket Number & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-slate-900 group-hover:text-amber-700">
                          #{item.ticketNumber}
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2">
                          वॉर्ड {item.wardId}
                        </span>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-none border ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isPendingVerification
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {isResolved
                          ? (language === 'mr' ? '✓ अधिकारी मंजूर' : '✓ Resolved')
                          : isPendingVerification
                          ? (language === 'mr' ? '⏳ पडताळणी प्रलंबित' : '⏳ Awaiting Adhikari')
                          : (language === 'mr' ? 'काम बाकी' : 'Pending Work')}
                      </span>
                    </div>

                    {/* Photo Thumbnail & Title */}
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-14 shrink-0 rounded-none overflow-hidden border border-slate-300 bg-slate-100 relative">
                        <CivicPhotoDisplay type={item.photoUrl} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.2">
                          BEFORE
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-900">
                          {getComplaintTitle(item, language)}
                        </h4>
                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block mt-0.5">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {/* Location & Reported date */}
                    <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.locationAddress}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{item.reportedAt}</span>
                        <span>SLA: {item.slaHoursRemaining}h left</span>
                      </div>
                    </div>

                    {/* Proof Status Badge if Already Uploaded */}
                    {hasProof && (
                      <div className="p-1.5 bg-slate-50 border border-slate-200 text-[10px] flex items-center justify-between">
                        <span className="font-bold text-slate-700">
                          {language === 'mr' ? 'अपलोड पुरावा:' : 'Uploaded Proof:'}
                        </span>
                        <span className="font-mono text-emerald-800 font-bold">
                          Er. {item.proofOfWork?.engineerId || 'E101'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tap-to-Action Bottom Banner */}
                  <div className="mt-3 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      className={`w-full py-1.5 px-2 text-xs font-black flex items-center justify-center gap-1 rounded-none transition-colors ${
                        isSelected
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>
                        {isPendingVerification
                          ? (language === 'mr' ? 'फोटो अपडेट / बदल करा' : 'Update Work Photo')
                          : (language === 'mr' ? 'टॅप करा व कामाचा फोटो जोडा' : 'Tap to Add Work Photo')}
                      </span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
