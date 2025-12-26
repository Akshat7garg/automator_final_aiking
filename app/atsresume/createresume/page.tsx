"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import LeftSidebar from "@/components/left/LeftSidebar";
import Resume from "@/components/resume_templates/bonzor";
import Rightsidebar from "@/components/right/Rightsidebar";
import { ref, getDatabase, get } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app from "@/firebase/config";
import fillResumeData from "@/components/oneclick/page";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  useAchievementStore,
  useCertificateStore,
  useEducationStore,
  useExperienceStore,
  useLanguageStore,
  usePersonalDataStore,
  useProjectStore,
  useSkillStore,
  useThemeStore,
} from "@/app/store";
import Luxary from "@/components/resume_templates/luxary";
import Unique from "@/components/resume_templates/Unique";
import Classic from "@/components/resume_templates/Classic";
import { HiMenu, HiX } from "react-icons/hi";
import { fetchUserDetails } from "@/components/fetch_user_details/page";
import { toast } from "react-toastify";

// ---- pdf.js
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.js";
import Celibi from "@/components/resume_templates/Celibi";
import Modern from "@/components/resume_templates/modern";
import Glalie from "@/components/resume_templates/glalie";
import Pikachu from "@/components/resume_templates/pikachu";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version
  }/pdf.worker.min.js`;

const db = getDatabase(app);

const CreateResume: React.FC = () => {
  // ===== refs
  const resumeRef = useRef<HTMLDivElement>(null);
  const lastPdfBlobRef = useRef<Blob | null>(null);

  const [uid, setUid] = useState<string | null>(null);

  // ===== data state
  const [dataReady, setDataReady] = useState(false);
  const [resumeData, setResumeData] = useState<unknown>(null);
  const [apiKey, setApiKey] = useState("");
  const [job_description, setJD] = useState<string | null>(null);
  const [previous_resume_data, setRD] = useState<string | null>(null);

  // ===== UI state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [needsPreview, setNeedsPreview] = useState(true);

  const { selectedTemplate, ...theme } = useThemeStore();
  const { skills } = useSkillStore();
  const { projects } = useProjectStore();
  const { languages } = useLanguageStore();
  const { experiences } = useExperienceStore();
  const { educations } = useEducationStore();
  const { certificates } = useCertificateStore();
  const { achievements } = useAchievementStore();
  const { personalData } = usePersonalDataStore();

  const datapath = useMemo(
    () => (uid ? ref(db, `user/${uid}/resume_data/newData/`) : null),
    [uid]
  );

  // ===== templates
  const templates: Record<string, React.FC> = useMemo(
    () => ({
      bonzor: Resume,
      luxary: Luxary,
      unique: Unique,
      classic: Classic,
      celibi: Celibi,
      modern: Modern,
      glalie: Glalie,
      pikachu: Pikachu,
    }),
    []
  );

  const SelectedTemplateComponent = useMemo(() => {
    const key = (selectedTemplate || "bonzor").toLowerCase();
    return templates[key] || Resume;
  }, [selectedTemplate, templates]);

  // ===== auth/bootstrap
  useEffect(() => {
    const auth = getAuth(app);
    const unsub = auth.onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);


  useEffect(() => {
    const init = async () => {
      try {
        // 1️⃣ Read localStorage FIRST
        const JD = localStorage.getItem("jobDescription");
        const RD = localStorage.getItem("resumeText");
        const key =
          localStorage.getItem("api_key") ||
          localStorage.getItem("apiKey");

        setJD(JD);
        setRD(RD);
        setApiKey(key || "");

        if (!JD || !RD || !key) {
          toast.error("Required data missing. Please re-upload.");
          setTimeout(() => {
            window.location.href = "/resume2";
          }, 1500);
          return;
        }

        // 2️⃣ Fetch user details only AFTER uid exists
        if (uid) {
          const userData = await fetchUserDetails(uid);
          if (userData?.apiKey) {
            localStorage.setItem("api_key", userData.apiKey);
          }
        }

        // 3️⃣ Explicitly mark data ready
        setDataReady(true);
      } catch (err) {
        console.error("Init failed:", err);
        toast.error("Initialization failed");
      }
    };

    if (uid !== null) {
      init();
    }
  }, [uid]);

  // ===== Gemini
  const geminiClient = useMemo(() => {
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
  }, [apiKey]);


  const analyzeResumeForSkill = useCallback(async () => {
    const prompt = `
      You are an AI that generates structured resume data in JSON format. Below, I will provide previous resume data and a job description. Your task is to carefully analyze both, understand the job requirements, and update the resume while ensuring that all fields remain correctly structured with relevent keywords from job discription.

      Instructions:
        1. Retain personal details exactly as they are without any modifications add relevent keywords from job discription.
        2. Modify the 'skills' section to align with the job description while maintaining the structure. Ensure that all skills are grouped under relevant headings and formatted as in the example JSON.
        3. Update the 'experiences' section by emphasizing responsibilities and achievements relevant to the job description. Retain the same structure and formatting.
        4. Preserve the JSON structure exactly as shown in the example, ensuring that key names remain unchanged.
        5. Ensure uniformity in field values (e.g., the format of dates, lists, objects) so that the modified resume is consistent with the example structure.

      Input Data:
        Previous Resume Data:
          ${previous_resume_data}

        Job Description:
          ${job_description}

      Output Format:
        Return the updated resume in JSON format ensuring all key names, structures, and data formats are identical to the following example:

      \`\`\`json
        {
          "personalData": {
            "name": "John Doe",
            "headline": "Software Developer",
            "summary": "Experienced in web development",
            "profile": "profile-url",
            "address": "123 Main St, City",
            "phone": "1234567890",
            "email": "john@example.com",
            "skill": "React, Node.js",
            "hobbie": "Reading, Coding",
            "language": "English, French",
            "twitter": "john_twitter",
            "linkedin": "john_linkedin",
            "github": "john_github",
            "location": "City, Country",
            "website": "www.johndoe.com"
          },
          "projects": [
            {
              "name": "Portfolio Website",
              "description": "Personal website",
              "date": "2023",
              "website": "www.portfolio.com"
            }
          ],
          "educations": [
            {
              "institute": "XYZ University",
              "areaofstudy": "Computer Science",
              "typeofstudy": "Bachelors",
              "dateRange": "2015-2019",
              "score": "3.8 GPA"
            }
          ],
          "certificates": [
            {
              "title": "AWS Certified",
              "awarder": "Amazon",
              "date": "2022",
              "link": "www.aws.com"
            }
          ],
          "experiences": [
            {
              "company": "Tech Corp",
              "position": "Software Engineer",
              "dateRange": "2020-2024",
              "location": "Remote",
              "description": "Developed web applications"
            }
          ],
          "skills": [
            {
              "heading": "Frontend",
              "items": "React, JavaScript"
            },
            {
              "heading": "Backend",
              "items": "Node.js, JavaScript, Mongodb"
            }
          ],
          "achievements": [
            {
              "name": "Hackathon Winner",
              "details": "Won XYZ Hackathon"
            }
          ],
          "languages": [
            {
              "heading": "English",
              "option": "Fluent"
            }
          ]
        }
      \`\`\`
      `;

    try {
      if (!geminiClient) {
        console.error("Gemini client not initialized");
        return;
      }

      const model = geminiClient.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });

      const response = await model.generateContent(prompt);
      const textResponse =
        response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || null;

      if (!textResponse) {
        throw new Error("Empty Gemini response");
      }

      const cleaned = textResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      let parsedJSON;
      try {
        parsedJSON = JSON.parse(cleaned);
      } catch (err) {
        console.error("Gemini raw response:", textResponse);
        throw err;
      }

      setResumeData(parsedJSON);
      return parsedJSON;

    } catch (error) {
      console.error("Gemini error:", error);
      return { message: "Failed to process Gemini API response." };
    }
  }, [geminiClient, job_description, previous_resume_data]);

  useEffect(() => {
    if (!dataReady || !geminiClient) return;
    analyzeResumeForSkill();
  }, [dataReady, geminiClient, analyzeResumeForSkill]);

  useEffect(() => {
    if (dataReady && !resumeData) {
      const timeout = setTimeout(() => {
        toast.error("Resume generation failed. Please try again.");
      }, 15000);

      return () => clearTimeout(timeout);
    }
  }, [dataReady, resumeData]);

  useEffect(() => {
    if (resumeData) {
      fillResumeData(resumeData);
      try {
        localStorage.setItem("resumeData", JSON.stringify(resumeData));
      } catch {
        // ignore localStorage errors
      }
    }
  }, [resumeData]);

  useEffect(() => {
    setNeedsPreview(true);
  }, [
    personalData,
    skills,
    projects,
    languages,
    experiences,
    educations,
    certificates,
    achievements,
    theme.backgroundColor,
    theme.primaryColor,
    theme.selectedFont,
    theme.fontWeight,
    theme.fontStyle,
    theme.fontSize,
    theme.lineHeight,
    theme.hideIcons,
    theme.underlineLinks,
  ]);

  // ===== Build HTML snapshot (resume only) with CSS links from hidden DOM
  const buildHtmlForPdf = useCallback(() => {
    const node = resumeRef.current;
    if (!node) return null;

    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    )
      .map((l) => {
        const href = l.getAttribute("href");
        if (!href) return null;

        const absolute = href.startsWith("http")
          ? href
          : `${window.location.origin}${href}`;
        return `<link rel="stylesheet" href="${absolute}" />`;
      })
      .filter(Boolean)
      .join("\n");

    const styles = Array.from(
      document.querySelectorAll<HTMLStyleElement>("head style")
    )
      .map((s) => `<style>${s.innerHTML}</style>`)
      .join("\n");

    const body = `
      <div id="resume-root" style="width:210mm; padding:3mm; background:#ffffff;">
        ${node.innerHTML}
      </div>
    `;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          ${links}
          ${styles}
          <style>
            @page { size: A4; margin: 3mm; }
            html, body { margin:0; padding:0; background:#ffffff; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>${body}</body>
      </html>
    `;
    return html;
  }, []);

  // ===== PDF -> images (one per page)
  const pdfBlobToImages = useCallback(async (blob: Blob, scale = 2) => {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer })
      .promise;

    const images: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const imgData = canvas.toDataURL("image/png");
      images.push(imgData);
    }
    return images;
  }, []);

  // ===== Regenerate preview: build HTML -> API -> Blob -> images
  const regeneratePreview = useCallback(async () => {
    const html = buildHtmlForPdf();
    if (!html || html.trim().length < 50) return;

    setRendering(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      lastPdfBlobRef.current = blob;

      const imgs = await pdfBlobToImages(blob, 2);
      setPageImages(imgs);

      setNeedsPreview(false);
    } catch (e) {
      console.error("Preview generation failed:", e);
      toast.error("Failed to render preview.");
    } finally {
      setRendering(false);
    }
  }, [buildHtmlForPdf, pdfBlobToImages]);

  // Debounced auto-update on data/template changes
  useEffect(() => {
    if (!resumeData || !selectedTemplate) return;

    const t = setTimeout(() => {
      regeneratePreview();
    }, 500);

    return () => clearTimeout(t);
  }, [resumeData, selectedTemplate, regeneratePreview]);

  // ===== Download PDF (use latest blob if available, otherwise regenerate now)
  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);

      if (needsPreview) {
        await regeneratePreview();
      }

      if (lastPdfBlobRef.current) {
        const url = URL.createObjectURL(lastPdfBlobRef.current);
        const a = document.createElement("a");
        a.href = url;
        a.download = "resume.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      toast.error("PDF generation failed.");
    } finally {
      setDownloading(false);
    }
  }, [needsPreview, regeneratePreview]);

  // ===== toggles
  const toggleSidebar = (side: "left" | "right") => {
    if (side === "left") {
      setIsLeftSidebarOpen((v) => !v);
      setIsRightSidebarOpen(false);
    } else {
      setIsRightSidebarOpen((v) => !v);
      setIsLeftSidebarOpen(false);
    }
  };

  return (
    <>
      {needsPreview && resumeData && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={regeneratePreview}
            disabled={rendering}
            className="w-full inline-flex items-center justify-center px-6 py-3 mb-3 text-sm sm:text-base font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            {rendering ? "Updating Preview…" : "🔁 Generate Preview"}
          </button>
        </div>
      )}

      {resumeData ? (
        <div className="relative flex flex-col lg:flex-row h-screen overflow-hidden">
          {/* Mobile bar */}
          <div className="lg:hidden flex justify-between p-4 bg-[#0F011E] fixed w-full top-0 z-40">
            <button
              onClick={() => toggleSidebar("left")}
              className="text-white text-2xl"
            >
              {isLeftSidebarOpen ? <HiX /> : <HiMenu />}
            </button>
            <button
              onClick={() => toggleSidebar("right")}
              className="text-white text-2xl"
            >
              {isRightSidebarOpen ? <HiX /> : <HiMenu />}
            </button>
          </div>

          {/* overlay */}
          {(isLeftSidebarOpen || isRightSidebarOpen) && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => {
                setIsLeftSidebarOpen(false);
                setIsRightSidebarOpen(false);
              }}
            />
          )}

          {/* Left */}
          <div
            className={`md:w-3/4 lg:w-3/12 w-full h-screen transition-transform duration-300 pt-12 lg:pt-0 ${isLeftSidebarOpen ? "translate-x-0" : "-translate-x-full"
              } lg:translate-x-0 fixed lg:static bg-[#0F011E] z-40`}
          >
            <LeftSidebar />
          </div>

          {/* Center: PDF page images (A4 width) */}
          <div className="flex-1 bg-gray-200 overflow-y-auto pb-4 pl-4 sm:pl-6 md:pl-16 lg:pl-4 pr-4 sm:pr-6 md:pr-16 lg:pr-4 pt-16 lg:pt-4">
            {rendering && (
              <div className="flex justify-center items-center mb-3 text-gray-700">
                <div className="animate-spin rounded-full h-6 w-6 border-t-4 border-[#0FAE96]"></div>
                <span className="ml-2 text-sm">Rendering preview…</span>
              </div>
            )}

            <div className="mx-auto">
              {pageImages.length > 0 ? (
                pageImages.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Page ${i + 1}`}
                    className="bg-white shadow-sm mb-4 block w-full rounded-sm"
                  />
                ))
              ) : (
                <div className="mx-auto bg-white shadow-sm text-gray-400 flex items-center justify-center p-10">
                  Preparing resume preview…
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div
            className={`md:w-3/4 lg:w-3/12 w-full h-screen flex flex-col transition-transform duration-300 pt-12 lg:pt-0 ${isRightSidebarOpen ? "translate-x-0" : "translate-x-full"
              } lg:translate-x-0 fixed lg:static bg-[#0F011E] z-40 right-0`}
          >
            {/* TOP SECTION — Buttons */}
            <div className="flex-shrink-0 p-4 border-b border-white/10">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full inline-flex items-center justify-center px-6 py-3 text-sm sm:text-base font-semibold text-white bg-[#0FAE96] rounded-md hover:bg-[#0FAE96]/90 disabled:opacity-60"
              >
                {downloading ? "Generating…" : "💾 Download PDF"}
              </button>
            </div>

            {/* BOTTOM SECTION — Scrollable Tools */}
            <div className="w-full flex-1 overflow-y-auto">
              <Rightsidebar />
            </div>
          </div>

          {/* Hidden: LIVE resume DOM bound to store (source for HTML snapshot) */}
          <div className="hidden" aria-hidden="true">
            <div
              ref={resumeRef}
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "3mm",
                background: "#ffffff",
              }}
            >
              <SelectedTemplateComponent
                key={`hidden-${selectedTemplate || "bonzor"}`}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen w-full bg-[#11011E]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#00FFD1] border-solid"></div>
            <p className="text-white text-base sm:text-lg font-medium">
              Analyzing and building your resume...
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateResume;
