import React, { useEffect, useRef, useState } from "react";
import Modal from "@/app/Modal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { toast } from "react-toastify";
import { pdfjs } from "react-pdf";
import { fetchUserDetails } from "../fetch_user_details/page";


export default function ThreeStepsResume() {
  const [apiKey, setApiKey] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [actionType, setActionType] = useState<"build" | "analyze" | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const auth = getAuth();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        console.log("User signed in:", currentUser.uid);
      }
      else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const geminiClient = new GoogleGenerativeAI(apiKey);

  async function analyzeResumeForSkill(resumeText: string, jobData: string) {
    console.log("Analyzing resume with text:", resumeText.substring(0, 100) + "...");

    const prompt = `
    Analyze the following resume text against the job description.

        *Objectives:*
        1. *Provide a Skills Compatibility Score (0-100).*
        2. *Detailed Skills Compatibility Evaluation:* Assess strengths and weaknesses based on technical skills, soft skills, experience relevance, and adaptability.
        3. *Generate Actionable Suggestions for Improvement:* Provide improvements categorized into *Skills Enhancement*, *Training & Certifications*, *Experience Highlighting*, and *Additional Recommendations*.

        Respond *ONLY* with valid JSON enclosed in triple backticks (json ... ).

        The JSON should have the following structure:
        \\\ json
        {
  "Skills Compatibility Score": 10,
  "Detailed Skills Compatibility Evaluation": {
    "Technical Skills": {text:"The resume lists MSOffice and R Programming. The job description requires JavaScript, React/Angular, and web development skills. There is a significant mismatch.","rating": 2}//rating value must be 1 to 5
    "Soft Skills": {"text":"The resume lists communication, interpersonal, and project management skills. These are generally valuable, but the job description doesn't explicitly emphasize specific soft skills beyond usability.","rating": 1}
    "Experience Relevance": {"text":"The resume describes experience as a Socio-Political Research Analyst, which is not directly relevant to web application development. The focus is on data collection, analysis, and communication in a different domain.","rating": 4}
    "Adaptability": {"text":"The resume demonstrates adaptability through research and analysis in a socio-political context. However, there's no evidence of adapting to or learning new technologies required for web development.","rating": 2}
  },
  "Actionable Suggestions for Improvement": {
    "Skills Enhancement": [
      "Acquire proficiency in JavaScript, HTML, CSS, and related web development technologies.",
      "Learn a modern JavaScript framework such as React or Angular.",
      "Practice building web applications and implementing responsive design."
    ],
    "Training & Certifications": [
      "Enroll in online courses or bootcamps focused on web development.",
      "Consider obtaining certifications in relevant web technologies to demonstrate proficiency."
    ],
    "Experience Highlighting": [
      "If any past projects involved even minor web development aspects (e.g., creating simple data visualizations for reports), highlight those experiences.",
      "Create a portfolio of web development projects to showcase skills.",
      "Consider contributing to open-source web development projects to gain experience and build a portfolio."
    ],
    "Additional Recommendations": [
      "Tailor the resume to emphasize any transferable skills, such as analytical thinking, problem-solving, or communication, in the context of web development challenges.",
      "Network with web developers to learn more about the field and potential job opportunities.",
      "Consider an entry-level role or internship in web development to gain practical experience."
    ]
  }
}
  \\\

        Resume Text:
        ${resumeText}

        Job Description:
        ${jobData}`; // Your existing prompt

    try {
      const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const response = await model.generateContent(prompt);
      const textResponse = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new Error("Empty response from Gemini API.");
      }

      const regex = /```json\s*([\s\S]*?)\s*```/;
      const match = textResponse.match(regex);

      if (!match) {
        throw new Error("No valid JSON output found in Gemini API response.");
      }

      const parsedJSON = JSON.parse(match[1]);
      console.log("Parsed JSON:", parsedJSON);
      return parsedJSON;
    } catch (error: any) {
      console.error("Error in analyzeResumeForSkill:", error);
      throw new Error(`Failed to analyze resume: ${error.message || "Unknown error"}`);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log("File uploaded!");
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);

      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) return;
        try {
          const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
          pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.js`;
          const pdfDocument = await pdfjs.getDocument({ data: typedarray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => ("str" in item ? item.str : ""))
              .join(" ");
            fullText += pageText + "\n";
          }
          setResumeText(fullText);
        } catch (error) {
          console.error("Error processing PDF:", error);
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    }
  };

  const handleGetExistingResume = async () => {
    console.log("Fetching existing resume...");
    const simulatedResume = "Simulated resume text from your existing resume.";
    setResumeText(simulatedResume);
  };

  const handleDataSubmit = async () => {
    if (!inputValue.trim()) {
      setError("This field is required.");
      return;
    }
    if (!resumeText.trim()) {
      setError("Please upload or fetch your resume first.");
      return;
    }
    setError("");
    setAnalyzeLoading(true);

    try {
      const result = await analyzeResumeForSkill(resumeText, inputValue);
      localStorage.setItem("skill", JSON.stringify(result));
      toast.success("Resume analysis completed! Redirecting to results...");
      setTimeout(() => {
        window.location.href = "/ats-score/ats-skill";
      }, 500);
    } catch (error: any) {
      console.error("Error analyzing resume:", error);
      setError("Failed to analyze resume. Please try again.");
      toast.error("Failed to analyze resume skill compatibility.");
    } finally {
      setAnalyzeLoading(false);
      setIsModalOpen(false);
    }
  };

  const openModalForAnalyze = () => {
    setActionType("analyze");
    setIsModalOpen(true);
    setInputValue("");
    setError("");
  };

  const steps = [
    {
      id: 1,
      title: "Check Resume & Skills",
      description:
        "Find what’s missing and create the perfect ATS resume.",
      icon: "/images/resume.svg", // Path to the image for step 1
    },
    {
      id: 2,
      title: "Learn & Apply with AI",
      description:
        "Fill skill gaps for free and auto-apply to jobs.",
      icon: "/images/skill.svg", // Path to the image for step 2
    },
    {
      id: 3,
      title: "Get Hired",
      description:
        "Stand out. Get interviews. Land your dream job.",
      icon: "/images/job.svg", // Path to the image for step 3
    },
  ];

  const stepRefs = useRef<(HTMLDivElement | null)[]>([]); // Reference for steps
  const [isInView, setIsInView] = useState(false); // State to track visibility of steps



  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true); // Show step when in view
          } else {
            setIsInView(false); // Hide step when out of view
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of the step is in view
    );

    // Observe only non-null elements
    stepRefs.current
      .filter((step) => step !== null)
      .forEach((step) => observer.observe(step));

    return () => {
      stepRefs.current
        .filter((step) => step !== null)
        .forEach((step) => observer.unobserve(step));
    };
  }, []);


  const handleAnalyzeButtonClick = async () => {
    // Step 1: Check if user is logged in
    if (!user) {
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 2000)

      return; // stop further execution
    }

    // Step 2: Check if API key and user data exist
    const userData = await fetchUserDetails(user?.uid);

    if (userData) {
      const { apiKey, urd, rd } = userData;

      if (apiKey === "API_KEY_NOT_FOUND") {
        toast.error("Please Upload Your Gemini Key!");
        setTimeout(() => {
          window.location.href = "/gemini";
        }, 2000);
        return; // important! stop further execution
      }

      if (rd === "RD_DATA_NOT_FOUND") {
        toast.error("Please Upload Your Resume!");
        setTimeout(() => {
          window.location.href = "/resume2";
        }, 2000);
        return; // important! stop further execution
      }


      setApiKey(apiKey)
      localStorage.setItem("api_key", apiKey);
    }


    // Step 3: If all checks passed, open the modal
    openModalForAnalyze();
  };

  return (
    <div className="text-white py-16 px-6 lg:px-24">
      <div className="max-w-4xl mx-auto flex flex-col items-center space-y-6">
        {/* Section Title */}
        <div className="px-4 backdrop-blur-3xl py-2 space-x-3 border-[1.5px] border-[#FFFFFF0D] rounded-full flex items-center bg-[#FFFFFF05]">
          <div className="w-3 h-3 bg-[#0FAE96] rounded-full"></div>
          <div className="text-[#0FAE96] text-sm">How it works ?</div>
        </div>
        <h2 className="text-3xl font-bold">3 Steps to Get Your Dream Job</h2>
        <p className="text-gray-400">
          Build your resume in one click, fix skill gaps, auto-apply with AI, and get hired for your dream job—faster than ever.
        </p>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              ref={(el) => {
                stepRefs.current[index] = el;
              }}
              className={`bg-[#FFFFFF05]  border-[#ffffff17] border-[1.5px] rounded-lg p-6 space-y-4 transition-all duration-500 ease-in-out transform ${isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
                }`}
            >
              {/* Icon */}
              <div className="bg-[#2C223B] w-12 h-12 flex items-center justify-center rounded-full">
                <img
                  src={step.icon}
                  alt={`Icon for ${step.title}`}
                  className="w-6 h-6"
                />
              </div>
              {/* Title */}
              <h3 className="text-xl text-[#0FAE96]">{step.title}</h3>
              {/* Description */}
              <p className="text-gray-300">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <button
          className="bg-[#0FAE96] hover:bg-[#228273] text-white py-3 px-6 rounded-lg font-semibold mt-8"
          onClick={handleAnalyzeButtonClick}
          disabled={analyzeLoading || buildLoading}
        >
          {analyzeLoading ? "Analyzing..." : "Analyze Your Skills"}
        </button>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        loading={analyzeLoading}
        inputValue={inputValue}
        setInputValue={setInputValue}
        error={error}
        resumeText={resumeText}
        file={file}
        setFile={setFile}
        handleFileChange={handleFileChange}
        handelDataSubmit={handleDataSubmit} // Fixed typo
        handleGetExistingResume={handleGetExistingResume}
        actionType={actionType}
      />
    </div>
  );
}
