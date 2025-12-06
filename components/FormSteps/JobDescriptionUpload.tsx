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
  const [aiJobDescription, setAiJobDescription] = useState('');
  const [aiJobDescriptions, setAiJobDescriptions] = useState<string[]>([]);
  const [isFetchingJD, setIsFetchingJD] = useState(false);
  const [isProcessingJDs, setIsProcessingJDs] = useState(false);
  const auth = getAuth();

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
        const localKey = localStorage.getItem("geminiApiKey") || "";
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
      localStorage.setItem('geminiApiKey', apiKey.trim());
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
      let errorMessage = error.message || 'Failed to generate video data';
      if (error.message.includes('429')) {
        errorMessage = 'YouTube API quota exceeded. Please try again later or upgrade your plan.';
        toast.error(errorMessage);
        setTimeout(() => {
          window.location.href = '/upgrade';
        }, 3000);
      } else if (error.message.includes('403') || error.message.includes('invalid')) {
        errorMessage = 'Invalid YouTube API key. Please check your API key.';
        toast.error(errorMessage);
        setTimeout(() => {
          window.location.href = '/youtube-api';
        }, 3000);
      } else {
        toast.error(errorMessage);
      }
      setError(errorMessage);
      setFormStep(FormStep.JOB_DESCRIPTION);
      setIsProcessingJDs(false);
    } finally {
      setIsLoading(false);
      console.log('handleSubmit: Analysis finished, isLoading set to false');
    }
  }, [apiKey, state.jobDescriptions, analyzeData, setFormStep]);

  // Automate adding job descriptions and submitting
  useEffect(() => {
    const processJobDescriptions = async () => {
      if (aiJobDescriptions.length === 0 || isProcessingJDs) {
        console.log('processJobDescriptions: Skipping due to empty aiJobDescriptions or isProcessingJDs');
        return;
      }

      if (aiJobDescriptions.length < 5) {
        console.warn('processJobDescriptions: Received fewer than 5 job descriptions:', aiJobDescriptions.length, aiJobDescriptions);
        setError('Received fewer than 5 job descriptions. Please try again.');
        // toast.error('Received fewer than 5 job descriptions');
        return;
      }

      // Validate aiJobDescriptions
      const validJDs = aiJobDescriptions.filter(jd => typeof jd === 'string' && jd.trim());
      if (validJDs.length < 5) {
        console.error('processJobDescriptions: Insufficient valid job descriptions:', validJDs);
        setError(`Only ${validJDs.length} valid job descriptions found. Please try again.`);
        // toast.error(`Only ${validJDs.length} valid job descriptions found`);
        return;
      }

      setIsProcessingJDs(true);
      setShowAIPopup(false);
      console.log('processJobDescriptions: Starting to process', validJDs.length, 'job descriptions:', validJDs);

      try {
        let addedCount = 0;
        for (let i = 0; i < Math.min(validJDs.length, 5); i++) {
          const currentJD = validJDs[i];
          if (!currentJD?.trim()) {
            console.warn(`processJobDescriptions: Skipping empty JD at index ${i}:`, currentJD);
            continue;
          }

          // Set state and wait for it to update
          setJobTitle(aiJobRole);
          setJobCompany(aiCompanyName || '');
          setJobText(currentJD);
          console.log(`processJobDescriptions: Set JD ${i + 1}:`, {
            title: aiJobRole,
            company: aiCompanyName,
            text: currentJD.substring(0, 50) + '...',
          });

          // Wait for state update
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify jobText before adding
          if (!jobText.trim()) {
            console.error(`processJobDescriptions: jobText is empty after setting JD ${i + 1}`);
            continue;
          }

          const added = handleAddJob();
          if (!added) {
            console.error(`processJobDescriptions: Failed to add JD at index ${i}`);
            continue;
          }

          addedCount++;
          console.log(`processJobDescriptions: Added JD ${i + 1}, current jobDescriptions length: ${state.jobDescriptions.length}`);
        }

        if (addedCount < 5) {
          throw new Error(`Only ${addedCount} job descriptions were added successfully`);
        }

        console.log('processJobDescriptions: All JDs added, triggering submit');
        await handleSubmit();
      } catch (error) {
        console.error('processJobDescriptions: Error processing job descriptions:', error);
        setError(`Failed to process job descriptions: ${error.message}`);
        // toast.error(`Processing failed: ${error.message}`);
      } finally {
        setIsProcessingJDs(false);
        console.log('processJobDescriptions: Processing finished, isProcessingJDs set to false');
      }
    };

    processJobDescriptions();
  }, [aiJobDescriptions, aiJobRole, aiCompanyName, handleAddJob, handleSubmit, jobText]);

  const handleClick = () => {
    window.open("https://youtu.be/FeRTK3aHdIk", "_blank");
  };

  const handleFetchAIJD = async () => {
    if (!aiJobRole.trim()) {
      setError('Please enter a job role and subject');
      console.error('handleFetchAIJD: Job role is empty');
      // toast.error('Please enter a job role and subject');
      return;
    }

    setIsFetchingJD(true);
    try {
      console.log('handleFetchAIJD: Fetching job descriptions for', {
        jobRole: aiJobRole,
        companyName: aiCompanyName,
        experienceLevel: aiExperienceLevel,
      });
      const response = await fetch('https://google-grounding-backend.onrender.com/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobRole: aiJobRole, companyName: aiCompanyName, experienceLevel: aiExperienceLevel, apiKey: apiKey }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch job descriptions: ${errorText}`);
      }

      const data = await response.json();
      let updatedData = data.response
        .replace(/^```json\n?/, '')
        .replace(/^```\n?/, '')
        .replace(/\n```$/, '')
        .trim();

      const arrayData: string[] = JSON.parse(updatedData).filter((jd: string) => typeof jd === 'string' && jd.trim());
      console.log("length", arrayData.length)
      if (!Array.isArray(arrayData) || arrayData.length < 5) {
        throw new Error(`Insufficient valid job descriptions received: ${arrayData.length}`);
      }

      console.log('handleFetchAIJD: Received', arrayData.length, 'job descriptions:', arrayData.map(jd => jd.substring(0, 50) + '...'));
      setAiJobDescriptions(arrayData);
      setAiJobDescription(arrayData[0] || '');
      toast.success('Successfully fetched job descriptions!');
    } catch (error) {
      console.error('handleFetchAIJD: Error fetching AI job descriptions:', error);
      setError(`Failed to fetch job descriptions: ${error.message}`);
      // toast.error(`Failed to fetch job descriptions: ${error.message}`);
      setAiJobDescriptions([]);
      setAiJobDescription('');
    } finally {
      setIsFetchingJD(false);
      console.log('handleFetchAIJD: Fetch completed, isFetchingJD set to false');
    }
  };

  const handleCopyJD = () => {
    if (aiJobDescription) {
      navigator.clipboard.writeText(aiJobDescription);
      toast.success('Job description copied to clipboard!');
      setJobText(aiJobDescription);
    }
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

                <div className="flex justify-center mt-4 space-x-4">
                  <Button
                    onClick={() => setShowAIPopup(true)}
                    className="w-[200px] bg-[#7000FF] text-white font-raleway font-semibold text-base px-6 py-3 rounded-md transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7000FF] flex items-center justify-center"
                    disabled={isProcessingJDs}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Get Auto-JD</span>
                  </Button>
                  <Button
                    onClick={handleAddJob}
                    className="w-[200px] bg-[#0FAE96] text-white font-raleway font-semibold text-base px-6 py-3 rounded-md transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96] flex items-center justify-center"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A2E] rounded-xl p-8 w-full max-w-xl relative">
            <Button
              className="absolute top-4 right-4 text-[#0FAE96] hover:bg-[rgba(255,255,255,0.05)]"
              onClick={() => {
                setShowAIPopup(false);
                setAiJobRole('');
                setAiCompanyName('');
                setAiExperienceLevel('Mid-Level');
                setAiJobDescription('');
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
              {aiJobDescription && (
                <div className="mt-4">
                  <Textarea
                    className={`w-full text-base font-inter text-[#B6B6B6] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg px-4 py-2.5 transition-all duration-200 ${aiJobDescription ? 'min-h-[300px]' : 'min-h-[200px]'}`}
                    value={aiJobDescription}
                    readOnly
                  />
                  <Button
                    onClick={handleCopyJD}
                    className="mt-2 w-full bg-[#7000FF] text-white font-raleway font-semibold text-base px-6 py-3 rounded-md transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7000FF] flex items-center justify-center"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Job Description</span>
                  </Button>
                </div>
              )}
              {error && <p className="text-[#FF6B6B] text-sm font-inter mt-2">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDescriptionUpload;