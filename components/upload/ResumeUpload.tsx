'use client';

import { ChangeEvent, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/useCandidateStore';
import { Candidate } from '@/types/candidate';
import { toast } from 'react-toastify';
import app, { auth } from '@/firebase/config';
import { getDatabase, get, ref, set } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

type Props = {
  jobDescription: string;
  setJobDescription: (text: string) => void;
  recruiterSuggestion: string;
  setRecruiterSuggestion: (text: string) => void;
  jobTitle: string;
  setJobTitle: (text: string) => void;
};

export default function ResumeUpload({
  jobDescription,
  setJobDescription,
  recruiterSuggestion,
  setRecruiterSuggestion,
  jobTitle,
  setJobTitle,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCandidates } = useCandidateStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uid, setUid] = useState<string>("")
  const router = useRouter();
  const [premium, setPremium] = useState<boolean>(false);
  const [api_key, setApi_key] = useState<string>("")
  const db = getDatabase(app)

  // GET UID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else setUid("");
    });
    return () => unsubscribe();
  }, []);

  // Get API KEY
  useEffect(() => {
    const getApi = async () => {
      try {
        let apiRef = ref(db, `hr/${uid}/API/apikey`);
        let snapshot = await get(apiRef);

        if (snapshot.exists()) {
          setApi_key(snapshot.val());
          return;
        }

        apiRef = ref(db, `hr/${uid}/API/apiKey`);
        snapshot = await get(apiRef);

        if (snapshot.exists()) {
          setApi_key(snapshot.val());
        } else {
          window.location.href = '/hr/gemini';
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
        window.location.href = '/hr/gemini';
      }
    };

    if (uid) getApi();
  }, [uid, db, setApi_key]);

  // Get User Payment Status
  useEffect(() => {
    const getPaymentStatus = async function () {
      let paymentRef = ref(db, `hr/${uid}/Payment/Status`)
      let snapsort = await get(paymentRef);
      if (snapsort.exists()) {
        let val = snapsort.val();
        if (val == "Premium") setPremium(true)
      }
    };
    if (uid) getPaymentStatus();
  }, [uid]);


  // Load from localStorage
  useEffect(() => {
    const storedJobDescription = localStorage.getItem('jobDescription');
    const storedRecruiterSuggestion = localStorage.getItem('recruiterSuggestion');
    const storedJobTitle = localStorage.getItem('jobTitle');
    localStorage.removeItem('failedResumeFiles');

    if (storedJobDescription) setJobDescription(storedJobDescription);
    if (storedRecruiterSuggestion) setRecruiterSuggestion(storedRecruiterSuggestion);
    if (storedJobTitle) setJobTitle(storedJobTitle);
  }, []);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setSelectedFiles(Array.from(files));
  };

  const handleParseResumes = async () => {
    if (!jobDescription.trim()) {
      setError('Job description is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one resume file.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError('');
    const allCandidates: Candidate[] = [];
    const allFailedFiles: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        toast.info(`Processing file ${i + 1} of ${selectedFiles.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('jd', jobDescription);
        formData.append('rs', recruiterSuggestion);
        formData.append('jt', jobTitle);
        formData.append('status', premium.toString());
        formData.append('api_key', api_key);

        try {
          const res = await fetch(`https://resume-parser-jobform.onrender.com/parse-resumes`, {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            if (res.status === 429) {
              toast.error(`Rate limit exceeded. Redirecting...`);
              router.push('/hr/updateGemini');
              setLoading(false);
              return;
            }
            throw new Error(data.error || `Failed to parse ${file.name}`);
          }

          const { candidate, pdfParseFailedFiles: failed } = data;

          // -------- >>> ADDED LINE: store upload timestamp
          candidate.uploadedAt = new Date().toISOString();
          // --------------------------------------------------

          if (failed && failed.length > 0) {
            allFailedFiles.push(...failed);
          }

          if (!candidate || candidate.name === 'Unknown') {
            allFailedFiles.push(file.name);
            continue;
          }

          allCandidates.push(candidate);
          toast.success(`Processed ${file.name} successfully!`);
        } catch (err: any) {
          toast.error(`Error processing ${file.name}: ${err.message}`);
          allFailedFiles.push(file.name);
        }
      }

      if (allCandidates.length === 0) {
        setError('No valid resumes were processed successfully.');
        setLoading(false);
        return;
      }

      setCandidates(allCandidates);
      localStorage.setItem('failedResumeFiles', JSON.stringify(allFailedFiles));

      // Save to Firebase
      try {
        for (const candidate of allCandidates) {
          if (candidate.email) {
            const safeEmail = candidate.email.replace(/\./g, ',').toLowerCase();
            const marketingRef = ref(db, `shortlisted_marketing_data/${safeEmail}`);

            await set(marketingRef, {
              name: candidate.name,
              phone: candidate.phone,
              email: candidate.email,
              uploadedAt: candidate.uploadedAt, // <<<< ADDED HERE
              isDownload: false,
            });
          }
        }
      } catch (error) {
        console.error("Error saving to Firebase", error);
      }

      toast.success(`Resumes parsed successfully!`);
      setTimeout(() => {
        window.location.href = '/hr/candidates';
      }, 2000);

    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#11011E] py-12 px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7000FF] opacity-20 blur-[200px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF00C7] opacity-20 blur-[200px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-[#0FAE96] opacity-10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="w-full max-w-[70%] bg-[rgba(255,255,255,0.03)] backdrop-blur-lg border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with accent gradient and icon */}
        <div className="relative py-6 px-8 bg-gradient-to-r from-[rgba(15,174,150,0.15)] to-transparent border-b border-[rgba(255,255,255,0.06)] flex items-center">
          <div className="absolute top-0 left-0 h-full w-1 bg-[#0FAE96]"></div>

          {/* Resume analysis SVG icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mr-4 text-[#0FAE96]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
            <circle cx="17" cy="15" r="3" fill="none" />
            <path d="M21 19l-1.5-1.5" />
          </svg>

          <h2 className="text-2xl md:text-3xl font-bold text-[#ECF1F0] font-raleway tracking-wide">Upload Resumes</h2>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Job Details Section - All in vertical layout */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="jobTitle" className="text-sm font-medium text-[#ECF1F0] font-raleway flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#0FAE96]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
                Job Title
              </label>
              <textarea
                id="jobTitle"
                rows={2}
                placeholder="Enter the Job Title"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full p-4 border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#B6B6B6] font-inter bg-[rgba(0,0,0,0.2)] placeholder:text-[#B6B6B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0FAE96] focus:border-transparent transition-all duration-300 hover:border-[rgba(255,255,255,0.15)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="jobDescription" className="text-sm font-medium text-[#ECF1F0] font-raleway flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#0FAE96]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Job Description
              </label>
              <textarea
                id="jobDescription"
                rows={6}
                placeholder="Paste the Job Description here..."
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                className="w-full p-4 border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#B6B6B6] font-inter bg-[rgba(0,0,0,0.2)] placeholder:text-[#B6B6B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0FAE96] focus:border-transparent transition-all duration-300 hover:border-[rgba(255,255,255,0.15)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="recruiterNotes" className="text-sm font-medium text-[#ECF1F0] font-raleway flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#0FAE96]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
                Recruiter Notes
              </label>
              <textarea
                id="recruiterNotes"
                rows={3}
                placeholder="Recruiter notes or suggestions (optional)"
                value={recruiterSuggestion}
                onChange={e => setRecruiterSuggestion(e.target.value)}
                className="w-full p-4 border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#B6B6B6] font-inter bg-[rgba(0,0,0,0.2)] placeholder:text-[#B6B6B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0FAE96] focus:border-transparent transition-all duration-300 hover:border-[rgba(255,255,255,0.15)]"
              />
            </div>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4 border-t border-[rgba(255,255,255,0.06)] pt-6">
            <h3 className="text-lg font-medium text-[#ECF1F0] font-raleway flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5 mr-2 text-[#0FAE96]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="M9 15l3 3 3-3" />
              </svg>
              Resume Files
            </h3>

            <input
              type="file"
              accept=".pdf"
              multiple
              ref={inputRef}
              onChange={handleFileSelect}
              className="absolute w-0 h-0 opacity-0"
            />

            <button
              onClick={() => {
                console.log('Button clicked', inputRef.current);
                inputRef.current?.click();
              }}
              className="bg-[rgba(15,174,150,0.1)] text-[#0FAE96] border border-[#0FAE96]/30 font-raleway font-semibold text-base px-6 py-3 rounded-md transition-all duration-300 hover:scale-105 hover:bg-[#0FAE96]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] w-full flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Select PDF Resumes
            </button>

            {selectedFiles.length > 0 && (
              <div className="mt-4 p-4 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#ECF1F0] font-raleway flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-[#0FAE96]"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                  </span>
                  <span className="text-xs text-[#0FAE96] bg-[#0FAE96]/10 px-2 py-1 rounded-full">PDF only</span>
                </div>

                <div className="max-h-36 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {selectedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center p-2 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-[#0FAE96] mr-2 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M16 13H8" />
                        <path d="M16 17H8" />
                        <path d="M10 9H8" />
                      </svg>
                      <span className="text-sm text-[#B6B6B6] font-inter truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-red-500/20 text-red-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm font-inter">{error}</p>
              </div>
            )}
          </div>

          {/* Parse Button Section */}
          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
            <button
              onClick={() => {
                console.log('Parse Resumes button clicked');
                handleParseResumes();
              }}
              className={`z-10 bg-[#0FAE96] text-white font-raleway font-semibold text-base px-8 py-4 rounded-md w-full flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Short-listing Resumes...
                </div>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Short-list Resumes
                </>
              )}
            </button>
            <div className="flex items-center justify-center mt-4 text-xs text-[#B6B6B6]/70 font-inter">
              <span className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-[#0FAE96] mr-2 animate-pulse"></span>
                Ready to process • AI-powered resume analysis
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}