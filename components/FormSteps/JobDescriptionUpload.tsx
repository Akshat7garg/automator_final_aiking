"use client";
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/AppContext';
import { FormStep } from '@/types/index';
import { ArrowLeft, PlusCircle, X, ArrowRight, Sparkles, Loader2, Copy } from 'lucide-react';
import Analyzing from '@/components/FormSteps/Analyzing';
import { getAuth } from 'firebase/auth';
import { fetchGeminiApiKey, fetchSkillsDataFromFirebase, fetchUserResumeData } from '@/services/firebaseService';
import { toast } from 'react-toastify';
import { onAuthStateChanged } from 'firebase/auth';

type AIJobDescription = {
  jobTitle: string;
  responsibilities: string;
  requiredSkills: string;
  qualifications: string;
};

const JobDescriptionUpload = () => {
  const { state, addJobDescription, removeJobDescription, setFormStep, analyzeData, setResume } = useAppContext();
  const [jobText, setJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [uid, setUid] = useState<string>("");
  const [resumeText, setResumeText] = useState(state.resume?.text || '');
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [aiJobRole, setAiJobRole] = useState('');
  const [aiCompanyName, setAiCompanyName] = useState('');
  const [aiExperienceLevel, setAiExperienceLevel] = useState('Mid-Level');
  const [isFetchingJD, setIsFetchingJD] = useState(false);
  const [isProcessingJDs, setIsProcessingJDs] = useState(false);
  const [aiJobType, setAiJobType] = useState('Fresher');
  const auth = getAuth();

  const [allAIJobDescriptions, setAllAIJobDescriptions] = useState<AIJobDescription[]>([]);
  const [aiJobDescriptions, setAiJobDescriptions] = useState<AIJobDescription[]>([]);
  const [showAISelectPopup, setShowAISelectPopup] = useState(false);
  const [expandedAIJDIndex, setExpandedAIJDIndex] = useState<number | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUid(currentUser.uid);
      } else {
        toast.error("You need to be signed in to access this page!");
        setTimeout(() => {
          window.location.href = "/sign-in";
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (uid) {
      fetchSkillsDataFromFirebase(uid)
        .then((skillsData) => {
          if (
            skillsData &&
            Object.keys(skillsData).length > 0 &&
            skillsData.learningPath?.[0]?.skills?.[0]?.videos?.length > 0
          ) {
            setTimeout(() => {
              window.location.href = "/course/dashboard";
            }, 1000);
          }
        })
        .catch((error) => {
          console.error("Error fetching skills data:", error);
        });
    }
  }, [uid]);

  useEffect(() => {
    const getURD = async (uid: string) => {
      setError('');
      try {
        const urd = await fetchUserResumeData(uid);
        if (urd) {
          setSuccess((prevSuccess) => [...prevSuccess, "Resume data loaded successfully!"]);
          setResumeText(urd);
          setResume(urd);
        } else {
          setError('No resume data found in your profile.');
        }
      } catch (error) {
        console.error('Error fetching URD:', error);
        setError('Failed to load resume. Please try again or paste manually.');
        setTimeout(() => {
          window.location.href = "/resume2";
        }, 2000);
      }
    };
    if (uid) {
      getURD(uid);
    }
  }, [uid, setResume]);

  useEffect(() => {
    const fetchApiKey = async (uid: string) => {
      try {
        const key = await fetchGeminiApiKey(uid);
        if (key) {
          setApiKey(key);
          setSuccess((prevSuccess) => [...prevSuccess, "API key loaded successfully!"]);
        } else {
          toast.error("Please Provide Your API key");
          setError('No API key found in your profile.');
          setTimeout(() => {
            window.location.href = "/gemini";
          }, 2000);
        }
      } catch (error) {
        console.error('Error fetching Gemini API key:', error);
        setError('Failed to fetch API key. You can still enter it manually.');
        const localKey = localStorage.getItem("api_key") || "";
        setApiKey(localKey);
      }
    };
    if (uid) {
      fetchApiKey(uid);
    }
  }, [uid]);

  const handleAddJob = useCallback(() => {
    if (!jobText.trim()) {
      setError('Please paste a job description');
      console.error('handleAddJob: Job description is empty');
      toast.error('Please paste a job description');
      return false;
    }

    try {
      addJobDescription(jobText, jobTitle, jobCompany);
      setJobText('');
      setJobTitle('');
      setJobCompany('');
      setError('');
      console.log('handleAddJob: Job description added successfully');
      return true;
    } catch (error) {
      console.error('handleAddJob: Error adding job description:', error);
      setError('Failed to add job description');
      toast.error('Failed to add job description');
      return false;
    }
  }, [jobText, jobTitle, jobCompany, addJobDescription]);

  const handleSubmit = useCallback(async () => {
    if (state.jobDescriptions.length < 5) {
      setError('Please add at least 5 job descriptions');
      console.error('handleSubmit: Insufficient job descriptions:', state.jobDescriptions.length);
      // toast.error('Please add at least 5 job descriptions');
      return;
    }

    if (apiKey.trim()) {
      localStorage.setItem('api_key', apiKey.trim());
    }

    setIsLoading(true);
    try {

      console.log('handleSubmit: Starting analysis with JDs:', state.jobDescriptions.map(jd => ({
        id: jd.id,
        title: jd.title,
        text: jd.text.substring(0, 50) + '...'
      })));

      setFormStep(FormStep.ANALYZING);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000)
      );

      const result = await Promise.race([analyzeData(), timeoutPromise]);
      console.log('handleSubmit: Analysis completed successfully, result:', result);
      // if (!result?.videos?.length) {
      //   throw new Error('No video data generated from analysis');
      // }

      setFormStep(FormStep.RESULTS);
      toast.success('Analysis completed successfully!');
    } catch (error) {
      console.error('handleSubmit: Error during analysis:', error);

      const errorObj = error instanceof Error ? error : new Error(String(error));
      let errorMessage = errorObj.message || 'Failed to generate video data';

      if (errorObj.message.includes('429')) {
        errorMessage = 'YouTube API quota exceeded. Please try again later or upgrade your plan.';
        toast.error(errorMessage);

        setTimeout(() => {
          window.location.href = '/upgrade';
        }, 3000);
      } else if (errorObj.message.includes('403') || errorObj.message.includes('invalid')) {
        errorMessage = 'Invalid YouTube API key. Please check your API key.';
        toast.error(errorMessage);

        setTimeout(() => {
          window.location.href = '/youtube-api';
        }, 3000);
      } else {
        toast.error(errorMessage);
      }

      setError(errorMessage);
      setFormStep(FormStep.JOB_DESCRIPTIONS);
      setIsProcessingJDs(false);
    } finally {
      setIsLoading(false);
      console.log('handleSubmit: Analysis finished, isLoading set to false');
    }
  }, [apiKey, state.jobDescriptions, analyzeData, setFormStep]);

  const handleClick = () => {
    window.open("https://youtu.be/FeRTK3aHdIk", "_blank");
  };

  const handleFetchAIJD = async () => {
    if (!aiJobRole.trim()) {
      setError('Please enter a job role');
      return;
    }

    setIsFetchingJD(true);
    setError('');

    try {
      const storedApiKey = localStorage.getItem("api_key");

      if (!storedApiKey) {
        setError("Gemini API key not found. Please add it first.");
        setIsFetchingJD(false);
        return;
      }

      const response = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: aiJobRole,
          jobType: aiJobType,
          experienceLevel: aiExperienceLevel,
          apikey: storedApiKey, // ✅ EXACT match with backend
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      let cleaned = data.response
        .replace(/^```json/, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();

      const parsed: AIJobDescription[] = JSON.parse(cleaned);

      const validJDs = parsed.filter(
        (jd) =>
          jd &&
          typeof jd.jobTitle === "string" &&
          typeof jd.responsibilities === "string" &&
          typeof jd.requiredSkills === "string" &&
          typeof jd.qualifications === "string"
      );

      if (validJDs.length < 5) {
        throw new Error(`Only ${validJDs.length} valid job descriptions found`);
      }

      setAllAIJobDescriptions(validJDs);
      setAiJobDescriptions(validJDs); // selectable list
      
      setShowAISelectPopup(true);
      setShowAIPopup(false);
      // ❌ DO NOT auto open popup anymore
      toast.success("AI job descriptions fetched. Click 'AI JDs' to review.");


    } catch (err) {
      console.error(err);
      setError('Failed to fetch job descriptions');
      setAiJobDescriptions([]);
    } finally {
      setIsFetchingJD(false);
    }
  };

  const handleSelectAIJD = (jd: AIJobDescription) => {
    const fullText = `
      Job Title:
      ${jd.jobTitle}

      Responsibilities:
      ${jd.responsibilities}

      Required Skills:
      ${jd.requiredSkills}

      Qualifications:
      ${jd.qualifications}
      `.trim();

    addJobDescription(fullText, jd.jobTitle, aiCompanyName || "");

    setAiJobDescriptions((prev) =>
      prev.filter((item) => item !== jd)
    );
  };

  const copyAIJDToClipboard = (jd: AIJobDescription) => {
    const text = `
      Job Title:
      ${jd.jobTitle}

      Responsibilities:
      ${jd.responsibilities}

      Required Skills:
      ${jd.requiredSkills}

      Qualifications:
      ${jd.qualifications}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success("Job description copied!");
  };

  if (state.formStep === FormStep.ANALYZING || isProcessingJDs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#11011E]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#0FAE96] mx-auto" />
          <h2 className="mt-4 text-xl font-raleway font-medium text-[#ECF1F0]">
            {isProcessingJDs ? 'Adding Job Descriptions...' : 'Analyzing Job Descriptions...'}
          </h2>
          <p className="mt-2 text-[#B6B6B6] font-inter">
            {isProcessingJDs
              ? 'Please wait while we process your job descriptions.'
              : 'Please wait while we analyze your job descriptions.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#11011E]">
      <div className="w-full max-w-4xl mx-auto animate-fade-in py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-[rgba(255,255,255,0.02)] shadow-md border border-[rgba(255,255,255,0.05)] rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7000FF]/25 to-[#FF00C7]/25 blur-[180px] opacity-25 pointer-events-none"></div>
          <div className="px-6 py-8 relative">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-raleway font-bold text-[#ECF1F0]">🎯 Discover Exactly What You Need to Learn</h2>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-gradient-to-r from-[#7000FF] to-[#0FAE96] text-white font-semibold text-xs px-3 py-1.5 rounded-full shadow hover:scale-105 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] ml-4"
              >
                ⭐ Buy Premium
              </button>
            </div>
            <div className="mt-4 bg-[#3b796f13] rounded-xl p-4 border border-[#2D2B3F]">
              <p className="text-[#B6B6B6] font-inter mb-2">
                Add job descriptions <span className="text-[#0FAE96]">(5 Job Descriptions Recommended)</span>
              </p>
              <p className="text-[#B6B6B6] font-inter mb-2">By adding job descriptions, you’ll get:</p>
              <ul className="text-[#B6B6B6] font-inter space-y-2 list-disc list-inside">
                <li>Personalized skill roadmap</li>
                <li>Learning videos for each required skill</li>
              </ul>
              <button
                className="mt-4 px-4 py-2 bg-[#0FAE96] text-white rounded-lg font-inter hover:bg-[#0da789] transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] flex items-center justify-center"
                onClick={handleClick}
              >
                🎬 Watch Demo
              </button>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-8">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-m font-raleway font-medium text-[#ECF1F0] mb-2 block">
                      Job Title (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Frontend Developer"
                      className="w-full text-base font-inter text-[#B6B6B6] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FAE96] transition duration-200"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-m font-raleway font-medium text-[#ECF1F0] mb-2 block">
                      Company (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Acme Inc."
                      className="w-full text-base font-inter text-[#B6B6B6] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FAE96] transition duration-200"
                      value={jobCompany}
                      onChange={(e) => setJobCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-m font-raleway font-medium text-[#ECF1F0] mb-2 block">
                    Job Description*
                  </label>
                  <Textarea
                    placeholder="Paste the job description here..."
                    className="min-h-[200px] w-full text-base font-inter text-[#B6B6B6] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FAE96] transition duration-200"
                    value={jobText}
                    onChange={(e) => {
                      setJobText(e.target.value);
                      setError('');
                    }}
                  />
                </div>

                <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-2 mt-4">
                  <Button
                    onClick={() => setShowAIPopup(true)}
                    className="w-full sm:w-[200px] bg-[#7000FF] text-white font-raleway font-semibold px-6 py-3 rounded-md transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7000FF] flex items-center justify-center"
                    disabled={isProcessingJDs}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Get Auto-JD</span>
                  </Button>

                  {/* ✅ NEW BUTTON */}
                  {allAIJobDescriptions.length > 0 && (
                    <Button
                      onClick={() => setShowAISelectPopup(true)}
                      className="w-full sm:w-[200px] bg-[#1A1A2E] border border-[#0FAE96] text-[#0FAE96] font-raleway font-semibold px-6 py-3 rounded-md transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] flex items-center justify-center"
                    >
                      🤖 AI JDs ({aiJobDescriptions.length})
                    </Button>
                  )}

                  <Button
                    onClick={handleAddJob}
                    className="w-full sm:w-[200px] bg-[#0FAE96] text-white font-raleway font-semibold px-6 py-3 rounded-md transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] flex items-center justify-center"
                    disabled={isProcessingJDs}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Add ({state.jobDescriptions.length}/5)</span>
                  </Button>
                </div>

                {error && <p className="text-[#FF6B6B] text-sm font-inter mt-2">{error}</p>}
              </div>

              {state.jobDescriptions.length > 0 && (
                <div>
                  <h3 className="text-lg font-raleway font-medium text-[#ECF1F0] mb-4">Added Job Descriptions:</h3>
                  <div className="space-y-4">
                    {state.jobDescriptions.map((job) => (
                      <div
                        key={job.id}
                        className="border border-[rgba(255,255,255,0.05)] rounded-lg p-5 flex justify-between items-start"
                      >
                        <div>
                          <h4 className="font-raleway font-medium text-[#ECF1F0] text-base">
                            {job.title || 'Untitled Position'}
                            {job.company && ` at ${job.company}`}
                          </h4>
                          <p className="text-sm text-[#B6B6B6] font-inter line-clamp-2 mt-2">
                            {job.text}
                          </p>
                        </div>
                        <Button
                          className="text-[#0FAE96] font-inter text-sm h-10 px-3 transition duration-200 hover:bg-[rgba(255,255,255,0.05)] hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96]"
                          onClick={() => removeJobDescription(job.id)}
                          disabled={isProcessingJDs}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-[#11011E] px-6 py-6 flex justify-between">
            <Button
              className="bg-transparent text-[#0FAE96] font-raleway font-semibold text-base px-6 py-3 rounded-md h-10 transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96]"
              onClick={() => setFormStep(FormStep.RESUME)}
              disabled={isProcessingJDs}
            >
              <ArrowLeft className="mr-2 h-4 w-4 inline" />
              Back
            </Button>
            <Button
              className="bg-[#0FAE96] text-white font-raleway font-semibold text-base px-6 py-3 rounded-md h-10 transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              onClick={handleSubmit}
              disabled={state.jobDescriptions.length < 5 || state.isAnalyzing || isLoading || isProcessingJDs}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 h-4 w-4 inline" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {showAIPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-2 sm:px-4">
          <div className="bg-[#1A1A2E] rounded-2xl p-8 w-full max-w-xl relative">

            <Button
              className="absolute top-4 right-4 text-[#0FAE96] hover:bg-[rgba(255,255,255,0.05)]"
              onClick={() => {
                setShowAIPopup(false);
                setAiJobRole('');
                setAiCompanyName('');
                setAiExperienceLevel('Mid-Level');
                setAiJobType('Fresher');
                setAiJobDescriptions([]);
                setError('');
              }}
            >
              <X className="h-5 w-5" />
            </Button>
            <h3 className="text-xl font-raleway font-medium text-[#ECF1F0] mb-6">
              Generate Job Description with AI
            </h3>

            <div className="space-y-6">
              <div>
                <label className="text-base font-raleway font-medium text-[#ECF1F0] mb-2 block">
                  Job Role and Subject*
                </label>
                <Input
                  placeholder="e.g. Node.js Developer, JavaScript"
                  className="w-full text-base font-inter text-[#B6B6B6] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FAE96]"
                  value={aiJobRole}
                  onChange={(e) => {
                    setAiJobRole(e.target.value);
                    setError('');
                  }}
                  required
                />
              </div>

              <div>
                <label className="text-base font-raleway font-medium text-[#ECF1F0] mb-2 block">
                  Company Name (Optional)
                </label>
                <Input
                  placeholder="e.g. Acme Inc."
                  className="w-full text-base font-inter text-[#B6B6B6] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FAE96]"
                  value={aiCompanyName}
                  onChange={(e) => setAiCompanyName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-base font-raleway font-medium text-[#ECF1F0] mb-2 block">
                  Experience Level*
                </label>
                <Select
                  value={aiExperienceLevel}
                  onValueChange={setAiExperienceLevel}
                >
                  <SelectTrigger className="w-full text-base font-inter text-[#ECF1F0] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FAE96]">
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A2E] text-[#ECF1F0] border-[rgba(255,255,255,0.1)]">
                    <SelectItem value="Beginner" className="text-base py-2">Beginner</SelectItem>
                    <SelectItem value="Mid-Level" className="text-base py-2">Mid-Level</SelectItem>
                    <SelectItem value="Expert" className="text-base py-2">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-base font-raleway font-medium text-[#ECF1F0] mb-2 block">
                  Job Type*
                </label>
                <Select value={aiJobType} onValueChange={setAiJobType}>
                  <SelectTrigger className="w-full text-base font-inter text-[#ECF1F0] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0FAE96]">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A2E] text-[#ECF1F0] border-[rgba(255,255,255,0.1)]">
                    <SelectItem value="Intern" className="text-base py-2">Intern</SelectItem>
                    <SelectItem value="Fresher" className="text-base py-2">Fresher</SelectItem>
                    <SelectItem value="Junior" className="text-base py-2">Junior</SelectItem>
                    <SelectItem value="Senior" className="text-base py-2">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleFetchAIJD}
                className="w-full bg-[#0FAE96] text-white font-raleway font-semibold text-base px-6 py-3 rounded-md transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] flex items-center justify-center"
                disabled={isFetchingJD}
              >
                {isFetchingJD ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Get Job Descriptions</span>
                  </>
                )}
              </Button>
              {error && <p className="text-[#FF6B6B] text-sm font-inter mt-2">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {showAISelectPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-2 sm:px-4">
          <div
            className="bg-[#1A1A2E] rounded-2xl w-full max-w-3xl h-[85vh] sm:h-[80vh] flex flex-col shadow-xl"
          >
            {/* 🔒 FIXED HEADER */}
            <div
              className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 shrink-0"
            >
              <h3 className="text-lg sm:text-xl font-raleway font-medium text-[#ECF1F0]">
                Select Job Descriptions
              </h3>
              <Button
                className="text-[#0FAE96] hover:bg-white/5"
                onClick={() => setShowAISelectPopup(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* 🔄 SCROLLABLE JD LIST */}
            <div
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 scroll-bar"
            >
              {aiJobDescriptions.map((jd, index) => {
                const isExpanded = expandedAIJDIndex === index;

                return (
                  <div
                    key={`ai-jd-${index}`}
                    className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden"
                  >
                    {/* HEADER ROW */}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 pt-4 py-4 cursor-pointer border-b 
                        ${isExpanded ? "border-white/10" : "border-transparent"}`}
                      onClick={() =>
                        setExpandedAIJDIndex(isExpanded ? null : index)
                      }
                    >
                      <span className="text-[#ECF1F0] font-medium text-sm sm:text-base">
                        {jd.jobTitle}
                      </span>

                      {/* ADD BUTTON */}
                      <Button
                        className="bg-[#0FAE96] text-white h-8 px-4 text-sm rounded-lg self-start sm:self-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAIJD(jd);
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    {/* EXPANDABLE CONTENT */}
                    <div
                      className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-out
                  ${isExpanded ? "max-h-[1200px] opacity-100 pt-4" : "max-h-0 opacity-0 pt-0"}
                `}
                    >
                      <div className="px-4 pb-6 space-y-6 text-sm text-[#B6B6B6]">
                        <div>
                          <h4 className="text-[#ECF1F0] text-xs uppercase tracking-wide mb-2">
                            Responsibilities
                          </h4>
                          <pre className="whitespace-pre-wrap leading-relaxed">
                            {jd.responsibilities}
                          </pre>
                        </div>

                        <div>
                          <h4 className="text-[#ECF1F0] text-xs uppercase tracking-wide mb-2">
                            Required Skills
                          </h4>
                          <pre className="whitespace-pre-wrap leading-relaxed">
                            {jd.requiredSkills}
                          </pre>
                        </div>

                        <div>
                          <h4 className="text-[#ECF1F0] text-xs uppercase tracking-wide mb-2">
                            Qualifications
                          </h4>
                          <pre className="whitespace-pre-wrap leading-relaxed">
                            {jd.qualifications}
                          </pre>
                        </div>

                        {/* COPY BUTTON */}
                        <Button
                          className="bg-[#7000FF] text-white h-9 px-5 rounded-lg text-sm flex justify-center items-center gap-1"
                          onClick={() => copyAIJDToClipboard(jd)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Job Description
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {aiJobDescriptions.length === 0 && (
                <p className="text-[#B6B6B6] text-center mt-8">
                  All job descriptions have been added.
                </p>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default JobDescriptionUpload;