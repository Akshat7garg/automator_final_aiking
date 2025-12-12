"use client";
import { useState, useEffect } from "react";

import app from "@/firebase/config";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { toast } from "react-toastify";
import { ref, get, getDatabase } from "firebase/database";
import { pdfjs } from "react-pdf";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Modal from "@/app/Modal"; // Adjust the import path as necessary
import { fetchUserDetails } from "../fetch_user_details/page";

export default function GetHired() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobData, setJobData] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [pdfText, setPdfText] = useState("");

  const [buildLoading, setBuildLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [atsData, setAtsData] = useState(null);
  const [skill, setSkill] = useState(null);

  const [actionType, setActionType] = useState<"build" | "analyze" | null>(null);
  const db = getDatabase(app);
  const auth = getAuth();
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.js`;

  useEffect(() => {
    const api_key = localStorage.getItem("api_key");
    setApiKey(api_key || "");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        console.log("User signed in:", currentUser.uid);
      } else {
        setUser(null);
        console.log("No user signed in");
        toast.error("You need to be signed in to upload your resume.");
        setTimeout(() => {
          window.location.href = "/sign-in";
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (pdfText && pdfText.trim().length > 0 && jobData) {
      console.log("Sending text for ATS analysis:", pdfText);
      if (actionType === "build") {
        storeDataInLocalStorage(pdfText, jobData);
      } else if (actionType === "analyze") {
        sendResumeForAnalysis(pdfText, jobData);
      }
    } else {
      console.warn("Skipping ATS analysis: No valid resume text or Job Description.");
    }
  }, [jobData, pdfText, actionType]);

  useEffect(() => {
    if (atsData != null) {
      ATS();
    }
  }, [atsData]);

  const storeDataInLocalStorage = (resumeText: string, jobDescription: string) => {
    localStorage.setItem("resumeText", resumeText);
    localStorage.setItem("jobDescription", jobDescription);
    console.log("Data stored in localStorage:", { resumeText, jobDescription });
    if (actionType === "build") {
      window.location.href = `/atsresume/createresume`;
    }
  };

  const handelDataSubmit = async () => {
    if (!inputValue.trim()) {
      setError("This field is required.");
      return;
    }
    setJobData(inputValue);
    console.log("Saved Job Description:", inputValue);

    if (actionType === "build") {
      setBuildLoading(true);
    } else if (actionType === "analyze") {
      setAnalyzeLoading(true);
    }

    if (pdfText && pdfText.trim().length > 0) {
      if (actionType === "build") {
        storeDataInLocalStorage(pdfText, inputValue);
        setBuildLoading(false); // Reset after storing
      } else if (actionType === "analyze") {
        sendResumeForAnalysis(pdfText, inputValue);
        // Do not reset analyzeLoading here; it will be reset in sendResumeForAnalysis
      }
    } else {
      setError("Please upload or select a resume before submitting.");
      if (actionType === "build") setBuildLoading(false);
      if (actionType === "analyze") setAnalyzeLoading(false);
    }
  };

  const ATS = () => {
    console.log("from ATS");
    localStorage.setItem("JD", jobData);
    const skillsDataString = JSON.stringify(skill);
    localStorage.setItem("skill", skillsDataString);

    if (atsData != null) {
      const atsDataString = JSON.stringify(atsData);
      localStorage.setItem("atsData", atsDataString);

      setAnalyzeLoading(false); // Ensure analyzeLoading is reset here for analyze
      setIsModalOpen(false);

      if (actionType === "analyze") {
        window.location.href = `/ats-score/ats-next`;
      } else if (actionType === "build") {
        window.location.href = `/atsresume/createresume`;
      }
    }
  };

  const geminiClient = new GoogleGenerativeAI(apiKey);

  const sendResumeForAnalysis = async (resumeText: string, jobDescription: string) => {
    console.log("Preparing to send resume text:", resumeText);

    if (!resumeText || resumeText.trim().length === 0) {
      console.error("Error: Cannot send empty resume text.");
      setAnalyzeLoading(false);
      return;
    }

    try {
      const get_score = async () => {
        try {
          const analysisResult = await analyzeResumeForATS(resumeText);
          const analysisSkills = await analyzeResumeForSkill(resumeText, jobDescription);
          console.log("hii ats");
          console.log(analysisSkills, "skills");
          console.log(analysisResult.atsScore);
          setSkill(analysisSkills);
          setAtsData(analysisResult);
        } catch (error) {
          setAnalyzeLoading(false);
          const errorMessage = error instanceof Error ? error.message : "An error occurred";
          toast.error(errorMessage);
        }
      };
      get_score();
    } catch (error) {
      setAnalyzeLoading(false);
      console.error("Error analyzing resume:", error);
    }
  };

  async function analyzeResumeForATS(resumeText: unknown) {
    console.log("from analyzer", resumeText);

    const prompt = `
        Analyze the following resume text for *Applicant Tracking System (ATS) compatibility*.

        *Objectives:*
        1. *Provide an ATS Score (0-100):* Evaluate overall ATS compatibility.
        2. *Detailed ATS Compatibility Evaluation:* Assess keyword optimization, formatting, readability, and section organization.
        3. *Generate Actionable Suggestions for Improvement:* Provide improvements categorized into *Keywords*, *Formatting*, *Sections*, and *Content Clarity*.

        Respond *ONLY* with valid JSON enclosed in triple backticks (json ... ).
        The JSON should have the following structure:

        \`\`\`json
        {
          "atsScore": 65,
          "detailedEvaluation": {
            "keywordOptimization": { "text": "Fair. Keywords are present but not strategically placed...", "rating": 2 },
            "formatting": { "text": "Poor. The resume's structure is basic and relies heavily on visual separators...", "rating": 1 },
            "readability": { "text": "Fair. The language is generally clear, but the structure is somewhat dense...", "rating": 2 },
            "sectionOrganization": { "text": "Fair. Standard sections are present but the order could be optimized...", "rating": 2 }
          },
          "suggestions": {
            "keywords": [
              "Identify target job descriptions and extract relevant keywords...",
              "Incorporate keywords naturally into job descriptions...",
              "Use a mix of long-tail and short-tail keywords."
            ],
            "formatting": [
              "Use a clean, ATS-friendly template with minimal graphics...",
              "Employ a consistent font and font size throughout...",
              "Use clear section headings and subheadings."
            ]
          }
        }
        \`\`\`

        Resume Text:
        ${resumeText}
    `;

    try {
      const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const response = await model.generateContent(prompt);
      const textResponse = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        return { message: "Empty response from Gemini API." };
      }

      const regex = /```json\s*([\s\S]*?)\s*```/;
      const match = textResponse.match(regex);

      if (!match) {
        return { message: "No valid JSON output found in Gemini API response." };
      }

      const parsedJSON = JSON.parse(match[1]);
      return parsedJSON;
    } catch (error) {
      setAnalyzeLoading(false); // CHANGED: Use analyzeLoading instead of loading
      console.error("Error processing Gemini API response:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { message: "Failed to process Gemini API response.", error: errorMessage };
    }
  }

  async function analyzeResumeForSkill(resumeText: string, jobData: string) {
    console.log("from analyzer", resumeText);

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
        ${jobData}
        `;

    try {
      const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const response = await model.generateContent(prompt);
      const textResponse = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        return { message: "Empty response from Gemini API." };
      }

      const regex = /```json\s*([\s\S]*?)\s*```/;
      const match = textResponse.match(regex);

      if (!match) {
        return { message: "No valid JSON output found in Gemini API response." };
      }

      const parsedJSON = JSON.parse(match[1]);
      return parsedJSON;
    } catch (error) {
      setAnalyzeLoading(false); // CHANGED: Use analyzeLoading instead of loading
      console.error("Error processing Gemini API response:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { message: "Failed to process Gemini API response.", error: errorMessage };
    }
  }


  // Keep other functions like analyzeResumeForATS and analyzeResumeForSkill as they are

  const handleGetExistingResume = async () => {
    console.log("Fetching existing resume...");
    if (actionType === "build") {
      setBuildLoading(true);
    } else if (actionType === "analyze") {
      setAnalyzeLoading(true);
    }

    if (!user) {
      console.warn("User not signed in! Cannot fetch resume.");
      toast.error("You need to be signed in to access your resume.");
      setBuildLoading(false);
      setAnalyzeLoading(false);
      return;
    }

    const userId = user.uid;
    console.log("User ID:", userId);

    try {
      const userDocRef = ref(db, `user/${userId}/forms/keyvalues/URD`);
      const snapshot = await get(userDocRef);

      if (snapshot.exists()) {
        const resumeText = snapshot.val();
        console.log("Retrieved Resume Data:", resumeText);

        if (resumeText && resumeText.trim().length > 0) {
          setPdfText(resumeText);
        } else {
          console.warn("Fetched resume is empty.");
        }
      } else {
        console.log("No resume data found in database.");
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
    } finally {
      if (actionType === "build") {
        setBuildLoading(false);
      } else if (actionType === "analyze") {
        setAnalyzeLoading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (actionType === "build") {
      setBuildLoading(true);
    } else if (actionType === "analyze") {
      setAnalyzeLoading(true);
    }

    if (e.target.files && e.target.files.length > 0) {
      console.log("File uploaded!");
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);

      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) return;

        try {
          const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
          const pdfDocument = await pdfjs.getDocument({ data: typedarray }).promise;
          let fullText = "";

          for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: unknown) => ("str" in (item as object) ? (item as any).str : ""))
              .join(" ");
            fullText += pageText + "\n";
          }

          setPdfText(fullText);
        } catch (error) {
          console.error("Error processing PDF:", error);
          if (actionType === "build") setBuildLoading(false);
          if (actionType === "analyze") setAnalyzeLoading(false);
        } finally {
          if (actionType === "build") setBuildLoading(false);
          if (actionType === "analyze") setAnalyzeLoading(false);
        }
      };

      reader.readAsArrayBuffer(uploadedFile);
    } else {
      if (actionType === "build") setBuildLoading(false);
      if (actionType === "analyze") setAnalyzeLoading(false);
    }
  };

  const openModalForBuild = () => {
    setActionType("build");
    setIsModalOpen(true);
    setInputValue("");
    setError("");
  };

  const openModalForAnalyze = () => {
    setActionType("analyze");
    setIsModalOpen(true);
    setInputValue("");
    setError("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActionType(null);
    setBuildLoading(false);
    setAnalyzeLoading(false);
  };

  // Keep analyzeResumeForATS and analyzeResumeForSkill functions as they are

  const handleBuildButtonClick = async () => {
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
    openModalForBuild();
  };

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
    <div className={`bg-gradient-to-b font-sans from-[#11011E] via-[#35013e] to-[#11011E] bg-[#11011E] text-white pt-16 px-4 sm:px-6 md:px-16 lg:px-20 ${isModalOpen ? "pointer-events-none" : "pointer-events-auto"}`}>
      <div className="bg-[#FFFFFF05] rounded-xl px-6 sm:px-8 md:px-10 py-12 sm:py-14 md:py-16 border-[1.5px] border-[#ffffff17] max-w-7xl mx-auto flex flex-col lg:flex-row justify-between animate-fadeIn">

        {/* Left Content */}
        <div className="lg:w-1/2 space-y-5 sm:space-y-6 animate-slideInLeft">
          <div className="flex items-center space-x-2">
            <span className="bg-[#FFFFFF05] border border-[#ffffff17] px-3 py-1 rounded-full flex items-center text-sm">
              {Array(5)
                .fill(null)
                .map((_, index) => (
                  <img
                    key={index}
                    src="images/star.png"
                    alt="Star"
                    className="w-3 h-3 mr-1"
                  />
                ))}
              <span className="ml-1">4.5 star rated</span>
            </span>
          </div>

          <h1 className="font-bold leading-tight text-3xl sm:text-4xl lg:text-5xl">
            Only rejections? <br /> Resume and skills to blame.
          </h1>

          <p className="text-gray-300 text-sm sm:text-base lg:text-base">
            You're not getting rejected—you're being filtered out. Fix your resume, work on right skills, and pass the ATS with one click.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              className="bg-[#0FAE96] hover:bg-[#288d7d] text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              onClick={handleBuildButtonClick}
              disabled={buildLoading}
            >
              {buildLoading ? "Building..." : "Build your Resume"}
            </button>
            <button
              className="bg-[#0FAE96] hover:bg-[#288d7d] text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              onClick={handleAnalyzeButtonClick}
              disabled={analyzeLoading}
            >
              {analyzeLoading ? "Analyzing..." : "Analyze Your Resume"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              {["Img1.png", "Img2.png", "Img3.png", "Img4.png"].map((img, index) => (
                <img
                  key={index}
                  src={`images/${img}`}
                  alt={`Avatar ${index + 1}`}
                  className={`w-6 sm:w-8 h-6 sm:h-8 rounded-full border border-gray-700 object-cover ${index > 0 ? '-ml-1 sm:-ml-2' : ''}`}
                  style={{ zIndex: 5 - index }}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="px-2 sm:px-3 py-1 sm:py-2 mx-1 sm:mx-2">
              <div className="h-5 sm:h-6 w-px bg-gray-600 opacity-50" />
            </div>
            {/* Text */}
            <span className="text-xs sm:text-sm text-gray-300 leading-none self-center">
              and 350+ jobseekers using Jobform Automator
            </span>
          </div>


        </div>

        {/* Right Image Section */}
        <div className="mt-10 sm:mt-12 lg:mt-0 animate-slideInRight flex justify-center lg:justify-end">
          <img
            src="/images/resume.png"
            alt="Resume Preview"
            className="w-64 sm:w-80 md:w-96 transition-all duration-300 transform hover:scale-105"
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        loading={actionType === "build" ? buildLoading : analyzeLoading}
        inputValue={inputValue}
        setInputValue={setInputValue}
        error={error}
        file={file}
        setFile={setFile}
        resumeText={pdfText}
        handleFileChange={handleFileChange}
        handelDataSubmit={handelDataSubmit}
        handleGetExistingResume={handleGetExistingResume}
        actionType={actionType}
      />
    </div>
  );

}