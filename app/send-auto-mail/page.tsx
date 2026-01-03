"use client";
import { useState, useEffect, useRef } from "react";
import { FaBriefcase } from "react-icons/fa";
import CompanyCard from "@/components/companies/CompanyCard";
import { toast } from "react-toastify";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app, { auth } from "@/firebase/config";
import { getDatabase, ref, set, get, push } from "firebase/database";
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Toggle this to enable/disable mock data test button (for testing the custom email functionality)
const ENABLE_MOCK_DATA = false;

const Page = () => {
  const [isSending, setIsSending] = useState(true);
  const [isSent, setIsSent] = useState(false);
  const [emailArray, setEmailArray] = useState<string[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [uid, setUid] = useState("");
  const [urd, setUrd] = useState("");
  const [jsonData, setJsonData] = useState<any[]>([]);
  const [jobTitle, setJobTitle] = useState<string[]>([]);
  const [exp, setExp] = useState<number>(0);
  const [location, setLocation] = useState<string[]>([]);
  const [gemini_key, setGeminiKey] = useState("");
  const [emailLimitReached, setEmailLimitReached] = useState(false);
  const [resume, setResume] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState(""); // Default empty
  const [body, setBody] = useState(""); // Default empty
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor'); // Mobile tab state
  const resumeFetched = useRef(false);
  const hasRun = useRef(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const db = getDatabase(app);

  // Available placeholders for email customization
  const availablePlaceholders = [
    { key: "{company_name}", label: "Company Name", description: "Replaced with company name" },
    { key: "{job_title}", label: "Job Title", description: "Replaced with job position" },
    { key: "{location}", label: "Location", description: "Replaced with job location" },
    { key: "{your_name}", label: "Your Name", description: "Replaced with your name" },
  ];

  // Function to replace placeholders with actual company data
  const replacePlaceholders = (text: string, company: any) => {
    return text
      .replace(/{company_name}/gi, company?.company || '')
      .replace(/{job_title}/gi, company?.title || '')
      .replace(/{location}/gi, company?.location || '')
      .replace(/{your_name}/gi, userName || '');
  };

  // Function to insert placeholder at cursor position in body textarea
  const insertPlaceholder = (placeholder: string, target: 'subject' | 'body') => {
    if (target === 'body' && bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.substring(0, start) + placeholder + body.substring(end);
      setBody(newBody);
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else if (target === 'subject' && subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newSubject = subject.substring(0, start) + placeholder + subject.substring(end);
      setSubject(newSubject);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  // Step 1: Fetch user data and resume
  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    const name = localStorage.getItem("userName") || "";
    const verified = localStorage.getItem("emailVerified");
    const gemini_key = localStorage.getItem("api_key") || "";
    setGeminiKey(gemini_key);
    if (verified !== "true") {
      window.location.href = "/email_auth";
      return;
    }
    setUserEmail(email);
    setUserName(name);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        const DB_email = email.replace(/\./g, ",");
        const userRef = ref(db, `users/${DB_email}`);
        get(userRef)
          .then((snapshot) => {
            if (!snapshot.exists()) {
              toast.info("Please verify your email to continue.");
              localStorage.setItem("emailPermissionGranted", "false");
              setTimeout(() => {
                window.location.href = `/auth/google?email=${encodeURIComponent(email)}`;
              }, 2000);
            }
          })
          .catch((err) => {
            console.error("Database Error:", err.message);
            toast.error("Error verifying authentication. Please try again.");
          });

        const getUserData = async () => {
          if (emailLimitReached) return;
          try {
            let URD = localStorage.getItem("URD");
            const resumeRef = ref(db, `user/${user.uid}/forms/keyvalues/RD`);
            const resumeSnapshot = await get(resumeRef);
            if (resumeSnapshot.exists()) {
              setResume(resumeSnapshot.val());
              resumeFetched.current = true;
            } else {
              toast.error("No resume data found in database.");
              setTimeout(() => {
                window.location.href = "/resume2";
              }, 2000);
            }
            if (URD) {
              setUrd(URD);
            } else {
              const userRef = ref(db, `user/${user.uid}/forms/keyvalues/URD`);
              const snapshot = await get(userRef);
              if (snapshot.exists()) {
                setUrd(snapshot.val());
                localStorage.setItem("URD", snapshot.val());
              } else {
                toast.error("No URD data found.");
                setTimeout(() => {
                  window.location.href = "/resume2";
                }, 2000);
              }
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Error fetching user data:", message);
            toast.error("Error fetching user data.");
          }
        };

        getUserData();
      } else {
        toast.error("No user logged-in!");
        window.location.href = "/sign-in";
      }
    });

    return () => unsubscribe();
  }, []);

  // Step 2: Check authentication status
  useEffect(() => {
    if (!userEmail || emailLimitReached || !resumeFetched.current) return;

    const checkAuthStatus = async () => {
      try {
        const response = await fetch(
          `https://send-auto-email-user-render.onrender.com/check-auth?email=${encodeURIComponent(userEmail)}`
        );
        const data = await response.json();
        if (!response.ok || !data.authenticated) {
          toast.info("For security reasons, please verify your email again.");
          localStorage.setItem("emailPermissionGranted", "false");
          setTimeout(() => {
            window.location.href = data.reauthUrl || "/email_auth";
          }, 3000);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error checking auth status:", message);
        toast.error("Failed to verify authentication. Please try again.");
      }
    };

    checkAuthStatus();
  }, [userEmail, resume]);

  // Step 3: Check email count limit
  useEffect(() => {
    if (!uid || emailLimitReached) return;

    const getEmailCount = async () => {
      try {
        const emailCountRef = ref(db, `user/${uid}/Payment/email_count`);
        const snapshot = await get(emailCountRef);
        const email_count = snapshot.val() || 0;

        if (email_count >= 10000) {
          setEmailLimitReached(true);
          toast.warning(
            <div className="p-4 bg-gradient-to-r from-purple-800 via-pink-600 to-red-500 rounded-xl shadow-lg text-white">
              <h2 className="text-lg font-bold">💼 Email Limit Reached</h2>
              <p className="text-sm mt-1">
                You've hit the <span className="font-semibold">10000 email</span> limit on your free plan.
              </p>
              <p className="text-sm">
                Upgrade to <span className="underline font-semibold">Premium</span> to continue sending job applications automatically.
              </p>
            </div>,
            { autoClose: 8000 }
          );
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error fetching email count:", message);
      }
    };

    getEmailCount();
  }, [uid]);

  // Step 4: Reusable email sending function with validation
  const sendEmail = async (companyEmail: string, subjectParam?: string, bodyParam?: string) => {
    if (!userEmail) {
      toast.error("Sender email is missing.");
      return false;
    }
    if (!companyEmail) {
      toast.error("Company email is missing.");
      return false;
    }
    if (!resume) {
      toast.error("Resume link is missing.");
      return false;
    }
    if (!userName) {
      toast.error("Sender name is missing.");
      return false;
    }

    const finalSubject = subjectParam || ""; // Custom subject or empty
    const finalBody = bodyParam || ""; // Custom body or empty (no default "hello")

    // Debug log to check what's being sent
    console.log('Sending email to:', companyEmail);
    console.log('Subject:', finalSubject);
    console.log('Body:', finalBody);
    console.log('Full payload:', {
      sender_email: userEmail,
      company_email: companyEmail,
      resume_link: resume,
      sender_name: userName,
      subject: finalSubject,
      text: finalBody,
    });

    try {
      const response = await fetch("https://send-auto-email-user-render.onrender.com/send-job-application", {
        method: "POST",
        body: JSON.stringify({
          sender_email: userEmail,
          company_email: companyEmail,
          resume_link: resume,
          sender_name: userName,
          subject: finalSubject,
          text: finalBody,
          body: finalBody
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log(`Email sent successfully to ${companyEmail}`);
        return true;
      } else {
        const data = await response.json();
        console.error("Error from server:", data.error);
        if (response.status === 401 && data.reauthUrl) {
          toast.info("For security reasons, please verify your email again.");
          localStorage.setItem("emailPermissionGranted", "false");
          setTimeout(() => {
            window.location.href = data.reauthUrl || "/email_auth";
          }, 2000);
        } else {
          toast.error(`Error sending email to ${companyEmail}: ${data.error}`);
        }
        return false;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error sending email:", message);
      toast.error(`Failed to send email to ${companyEmail}.`);
      return false;
    }
  };

  // Batch email sending function
  const sendBatchEmails = async (sub: string, bod: string) => {
    try {
      let sentEmailCount = 0;
      const emailCountRef = ref(db, `user/${uid}/Payment/email_count`);
      const snapshot = await get(emailCountRef);
      let existingCount = snapshot.exists() ? snapshot.val() : 0;
      console.log("Existing email count:", existingCount);

      for (const email of emailArray) {
        if (existingCount + sentEmailCount >= 10000) {
          setEmailLimitReached(true);
          toast.warning(
            <div className="p-4 bg-gradient-to-r from-purple-800 via-pink-600 to-red-500 rounded-xl shadow-lg text-white">
              <h2 className="text-lg font-bold">💼 Email Limit Reached</h2>
              <p className="text-sm mt-1">
                You've hit the <span className="font-semibold">10000 email</span> limit on your free plan.
              </p>
              <p className="text-sm">
                Upgrade to <span className="underline font-semibold">Premium</span> to continue sending job applications automatically.
              </p>
            </div>,
            { autoClose: 8000 }
          );
          break;
        }

        // Find company data for this email
        const company = companies.find((c) => c.email === email);

        // Replace placeholders with actual company data
        const personalizedSubject = replacePlaceholders(sub, company);
        const personalizedBody = replacePlaceholders(bod, company);

        console.log(`Sending personalized email to ${company?.company || email}:`);
        console.log('Subject:', personalizedSubject);
        console.log('Body preview:', personalizedBody.substring(0, 100) + '...');

        const success = await sendEmail(email, personalizedSubject, personalizedBody);
        if (success) {
          sentEmailCount += 1;
          await set(emailCountRef, existingCount + sentEmailCount);
          console.log(`Updated email count to ${existingCount + sentEmailCount}`);
          if (company) {
            const marketingRef = ref(db, "hr_marketing_data");
            const newCompanyRef = push(marketingRef);
            await set(newCompanyRef, {
              companyName: company.company,
              email: company.email,
              isDownloaded: false,
            });
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Only clear localStorage after all emails are sent and UI is updated
      if (sentEmailCount > 0) {
        localStorage.removeItem("companies");
        console.log("Cleared companies from localStorage");
      }
      setIsSending(false);
      setIsSent(true);
      toast.success(`Successfully sent ${sentEmailCount} emails!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error sending emails:", message);
      toast.error("Failed to send emails.");
      setIsSending(false);
      setIsSent(true);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in both subject and body.");
      return;
    }
    console.log('Modal submit - Subject:', subject, 'Body:', body); // Debug log
    setShowModal(false);
    setIsSending(true);
    await sendBatchEmails(subject, body);
    // Reset fields after sending
    setSubject("");
    setBody("");
  };

  const handleCancel = () => {
    setShowModal(false);
    // Optionally clear companies if cancel, or keep for retry
    setSubject("");
    setBody("");
  };

  // Step 5: Authentication email sending (uses default, no subject/body needed for test)
  // useEffect(() => {
  //   if (!userEmail || !userName || !resumeFetched.current || emailLimitReached) return;

  //   const checkVerifyEmail = async () => {
  //     const success = await sendEmail("suman85bera@gmail.com", "", ""); // Empty for test
  //     if (!success) {
  //       console.error("Authentication email failed.");
  //     } else {
  //       console.log("Authentication email sent successfully (test).");
  //     }
  //   };

  //   checkVerifyEmail();
  // }, [userEmail, userName, resume]);

  // Step 6: Fetch Gemini response
  useEffect(() => {
    if (!urd || emailLimitReached) return;

    const fetchGeminiResponse = async () => {
      try {
        const exampleOutput = `[
          {"jobTitle": "Python Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "Backend Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "Full Stack Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "MERN Stack Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "Software Engineer", "location": "remote", "experience": "2-5"}
        ]`;

        const userPrompt = `Analyze the following resume and extract job titles, location, and experience range.
                    Response format:
                    \`\`\`json
                    [
                        {"jobTitle": "<Job Title>", "location": "<Preferred Location>", "experience": "<Experience Range>"}
                    ]
                    \`\`\`
                    Resume: ${urd}
                    Example Output:
                    \`\`\`json
                    ${exampleOutput}
                    \`\`\``;

        const genAI = new GoogleGenerativeAI(gemini_key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const response = await model.generateContent(userPrompt);
        const textResponse = await response.response.text();

        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
        const jsonOutput = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(textResponse);

        console.log("✅ Gemini Parsed Response:", jsonOutput);
        setJsonData(jsonOutput);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("❌ Error in fetchGeminiResponse:", message);
        toast.error("Failed to process resume with Gemini API.");
      }
    };

    // fetchGeminiResponse();
  }, [urd, gemini_key]);

  // Step 7: Process Gemini data
  useEffect(() => {
    if (!jsonData || jsonData.length === 0 || emailLimitReached) return;

    const processData = () => {
      try {
        const jobTitles = jsonData
          .filter((job) => job.jobTitle)
          .map((job) => job.jobTitle);
        setJobTitle(jobTitles);

        const validJobs = jsonData.filter(
          (job) => typeof job.experience === "string" && job.experience.includes("-")
        );
        const avgExperience =
          validJobs.length > 0
            ? validJobs.reduce((sum, job) => {
              const [min, max] = job.experience.split("-").map(Number);
              if (isNaN(min) || isNaN(max)) {
                console.warn(`Invalid experience range for job: ${job.jobTitle}, experience: ${job.experience}`);
                return sum;
              }
              return sum + (min + max) / 2;
            }, 0) / validJobs.length
            : 0;
        setExp(avgExperience);

        const locations = [...new Set(jsonData.filter((job) => job.location).map((job) => job.location))];
        setLocation(locations);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error processing Gemini data:", message);
        toast.error("Failed to process job data.");
      }
    };

    processData();
  }, [jsonData]);

  // Step 8: Verify user email in database
  useEffect(() => {
    if (!userEmail || emailLimitReached) return;

    const DB_email = userEmail.replace(/\./g, ",");
    const userRef = ref(db, `users/${DB_email}`);

    get(userRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          window.location.href = "/email_auth";
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Database Error:", message);
        toast.error("Error verifying user data.");
      });
  }, [userEmail]);

  // Step 9: Handle email data from extension and localStorage
  useEffect(() => {
    if (emailLimitReached) return;

    // Load companies from localStorage if available
    const storedCompanies = localStorage.getItem("companies");
    if (storedCompanies) {
      try {
        const parsedCompanies = JSON.parse(storedCompanies);
        setCompanies(parsedCompanies);
        const emails = parsedCompanies
          .map((company: any) => company.email)
          .filter((email: string) => email !== "Not found");
        setEmailArray(emails);
        console.log("Loaded companies from localStorage:", parsedCompanies);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error parsing stored companies:", message);
      }
    }

    // Listen for new jobs from extension
    const handleEmailsData = (event: any) => {
      const jobs = event.detail;
      console.log("Received jobs from extension:", jobs);

      const filteredJobs = jobs.filter((job: any) => job.email !== "Not found");
      localStorage.setItem("companies", JSON.stringify(filteredJobs));
      setCompanies(filteredJobs);

      if (filteredJobs.length > 0) {
        const emails = filteredJobs
          .map((company: any) => company.email)
          .filter((email: string) => email !== "Not found");
        setEmailArray(emails);
        console.log("Recruiter Emails:", emails);
      }
    };

    document.addEventListener("emailsData", handleEmailsData);

    return () => {
      document.removeEventListener("emailsData", handleEmailsData);
    };
  }, [emailLimitReached]);

  // Open modal when emails are available
  useEffect(() => {
    if (emailArray.length > 0 && !hasRun.current && !emailLimitReached && resumeFetched.current) {
      console.log("Opening modal for email customization...");
      setShowModal(true);
      hasRun.current = true;
    }
  }, [emailArray]);

  const handleUpdatePlan = () => {
    window.location.href = "/payment";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013e] to-[#11011E] py-12 text-white">
      <div className="max-w-7xl w-full mx-auto px-4 flex flex-col gap-6">
        {emailLimitReached && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] p-10 rounded-[12px] bg-[#11011E] border border-[#0FAE96] shadow-[0_0_12px_2px_#DFDFDF]240 text-center flex flex-col gap-5 scale-[1.2]">
            <h2 className="text-[32px] font-bold text-[#FFFFFF]">Email Limit Reached</h2>
            <p className="text-[16px] leading-6 text-[#B6B6B6]">
              Hit the <span className="font-semibold text-[#FFFFFF]">10000-email</span> free plan limit.
            </p>
            <p className="text-[16px] leading-6 text-[#B6B6B6]">
              Go <span className="underline font-semibold text-[#0FAE96]">Premium</span> to send more.
            </p>
            <button
              className="bg-[#0FAE96] text-[#FFFFFF] font-semibold py-2 px-6 rounded-[10px] hover:bg-[#0C8C79] transition-opacity duration-150 w-full max-w-[200px] mx-auto"
              onClick={handleUpdatePlan}
            >
              Upgrade
            </button>
          </div>
        )}

        {!emailLimitReached && companies.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <FaBriefcase className="text-white" />
              {isSending ? "Sending Emails..." : "Applications"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company, index) => (
                <div
                  key={index}
                  className="bg-[#11011E] border border-[#0FAE96] rounded-[10px] p-6 shadow-[0_0_8px_2px_#DFDFDF] hover:opacity-90 transition-opacity duration-150 h-full flex flex-col"
                >
                  <CompanyCard {...company} isSending={isSending} isSent={isSent} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - No companies yet */}
        {!emailLimitReached && companies.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <FaBriefcase className="text-6xl text-[#0FAE96] mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Companies Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Use the browser extension to scrape company data from job boards{ENABLE_MOCK_DATA ? ', or test the modal with sample data.' : '.'}
            </p>
            {ENABLE_MOCK_DATA && (
              <button
                onClick={() => {
                  // Load mock data for testing
                  const mockCompanies = [
                    { company: "TechCorp Inc", email: "hr@techcorp.com", location: "Remote", title: "Software Engineer" },
                    { company: "DataSoft LLC", email: "jobs@datasoft.com", location: "New York", title: "Data Analyst" },
                    { company: "WebDev Studios", email: "careers@webdev.io", location: "San Francisco", title: "Frontend Developer" },
                  ];
                  setCompanies(mockCompanies);
                  setEmailArray(mockCompanies.map(c => c.email));
                  setShowModal(true);
                  hasRun.current = true;
                }}
                className="px-6 py-3 bg-[#0FAE96] text-white rounded-lg hover:bg-[#0C8C79] transition-colors font-medium"
              >
                🧪 Test Modal with Sample Data
              </button>
            )}
          </div>
        )}
      </div>

      {/* Email Customization Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#11011E] rounded-xl border border-[#0FAE96] max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-[0_0_40px_rgba(15,174,150,0.3)]">
            {/* Header */}
            <div className="p-5 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">✉️ Customize Your Job Application Email</h2>
              <p className="text-gray-400 text-sm mt-1">
                💡 <strong>Tip:</strong> Use placeholders like <code className="bg-gray-800 px-1.5 py-0.5 rounded text-[#0FAE96]">{'{company_name}'}</code> and they will be replaced with actual data for each company!
              </p>
            </div>

            {/* Main Content - Two Columns on Desktop, Tabs on Mobile */}
            <div className="flex flex-col lg:flex-row max-h-[calc(95vh-180px)] overflow-hidden">

              {/* Mobile Tab Switcher */}
              <div className="lg:hidden flex border-b border-gray-700">
                <button
                  onClick={() => setMobileTab('editor')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === 'editor' ? 'text-[#0FAE96] border-b-2 border-[#0FAE96] bg-[#0FAE96]/10' : 'text-gray-400'}`}
                >
                  📝 Write Email
                </button>
                <button
                  onClick={() => setMobileTab('preview')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === 'preview' ? 'text-[#0FAE96] border-b-2 border-[#0FAE96] bg-[#0FAE96]/10' : 'text-gray-400'}`}
                >
                  👁️ Preview ({companies.length})
                </button>
              </div>
              {/* LEFT SIDE - Editor (Always visible on desktop, tab on mobile) */}
              <div className={`flex-1 p-5 overflow-y-auto custom-scrollbar lg:border-r border-gray-700 ${mobileTab !== 'editor' ? 'hidden lg:block' : ''}`}>
                <h3 className="text-lg font-semibold text-white mb-4">📝 Write Your Email</h3>

                {/* Subject Input with inline placeholders */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Subject Line</label>
                    <div className="flex gap-1">
                      {availablePlaceholders.slice(0, 2).reverse().map((p) => (
                        <button
                          key={p.key + '-subject'}
                          onClick={() => insertPlaceholder(p.key, 'subject')}
                          className="px-2 py-0.5 bg-[#0FAE96]/20 text-[#0FAE96] rounded text-xs font-mono hover:bg-[#0FAE96]/40 transition-all"
                          title={`Insert ${p.label} into subject`}
                        >
                          + {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    ref={subjectInputRef}
                    type="text"
                    placeholder="e.g., Application for {job_title} at {company_name}"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-[#0FAE96] focus:ring-2 focus:ring-[#0FAE96]/50 font-mono text-sm"
                  />
                </div>

                {/* Body Textarea with inline placeholders */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Email Body</label>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {availablePlaceholders.map((p) => (
                        <button
                          key={p.key + '-body'}
                          onClick={() => insertPlaceholder(p.key, 'body')}
                          className="px-2 py-0.5 bg-[#0FAE96]/20 text-[#0FAE96] rounded text-xs font-mono hover:bg-[#0FAE96]/40 transition-all"
                          title={`Insert ${p.label} into body`}
                        >
                          + {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={bodyTextareaRef}
                    placeholder={`Dear Hiring Manager,

I am writing to express my interest in the {job_title} position at {company_name}.

With my skills and experience, I believe I would be a great fit for your team in {location}.

Best regards,
{your_name}`}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-[#0FAE96] focus:ring-2 focus:ring-[#0FAE96]/50 h-64 resize-none font-mono text-sm leading-relaxed"
                    rows={10}
                  />
                </div>

                {/* Placeholder Legend */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2 font-medium">🏷️ Available Placeholders:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {availablePlaceholders.map((p) => (
                      <div key={p.key + '-legend'} className="flex items-center gap-2">
                        <code className="bg-gray-900 px-1.5 py-0.5 rounded text-[#0FAE96]">{p.key}</code>
                        <span className="text-gray-500">→ {p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE - Live Preview (Always visible on desktop, tab on mobile) */}
              <div className={`flex-1 p-5 bg-[#0d0d1a] overflow-y-auto custom-scrollbar ${mobileTab !== 'preview' ? 'hidden lg:block' : ''}`}>
                <h3 className="text-lg font-semibold text-white mb-2 lg:mb-4">👁️ Live Preview</h3>
                <p className="text-xs text-gray-500 mb-4">See how your email looks for each company:</p>

                {companies.length > 0 && (
                  <div className="space-y-4">
                    {companies.slice(0, 3).map((company, idx) => (
                      <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 bg-[#0FAE96] rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                          <span className="text-sm font-medium text-white">{company.company}</span>
                          <span className="text-xs text-gray-500">({company.email})</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400 text-xs uppercase tracking-wide">Subject:</span>
                            <p className="text-white font-medium mt-0.5">
                              {replacePlaceholders(subject || 'Your subject here...', company)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs uppercase tracking-wide">Body:</span>
                            <p className="text-gray-300 mt-0.5 whitespace-pre-wrap text-xs leading-relaxed">
                              {replacePlaceholders(body || 'Your email body will appear here...', company)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {companies.length > 3 && (
                      <p className="text-center text-gray-500 text-sm">+ {companies.length - 3} more companies...</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="p-5 border-t border-gray-700 flex justify-between items-center bg-[#11011E]">
              <p className="text-sm text-gray-400">
                📧 Sending to <span className="text-[#0FAE96] font-bold">{emailArray.length}</span> companies
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!subject.trim() || !body.trim()}
                  className="px-6 py-2.5 bg-[#0FAE96] text-white rounded-lg hover:bg-[#0C8C79] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  <span>📤</span> Send All Emails
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;