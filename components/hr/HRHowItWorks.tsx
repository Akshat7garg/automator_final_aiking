/** @format */
"use client";
import Link from "next/link";
import { useState } from "react";

interface StepProps {
  id: number;
  title: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
  imageOnLeft: boolean;
  videoId: string;
  thumbnail: string;
}

const Step = ({ id, title, description, buttonText, buttonLink, imageOnLeft, videoId, thumbnail }: StepProps) => {
  const [showVideo, setShowVideo] = useState(false);

  const handlePlayClick = () => {
    setShowVideo(true);
  };

  return (
    <div
      className={`flex flex-col md:flex-row ${imageOnLeft ? "md:flex-row-reverse" : ""
        } rounded-2xl bg-[#FFFFFF05] hover:bg-[#FFFFFF08] border-[#ffffff17] border-[1.5px] mx-4 md:mx-20 p-6 md:p-12 items-center gap-8 md:gap-12 transition-all duration-300`}
    >
      {/* Video/Image Container */}
      <div className="w-full md:w-1/2 h-48 md:h-[60vh] rounded-3xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 group relative">
        <div className="relative w-full h-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_0_80px_rgba(15,174,150,0.15)] hover:border-[rgba(15,174,150,0.2)]">
          {!showVideo ? (
            <>
              {/* Play button overlay */}
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-100 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                <button
                  onClick={handlePlayClick}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0FAE96] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-[0_0_30px_rgba(15,174,150,0.4)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96]"
                  aria-label="Play video"
                >
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>

              {/* Corner accent indicators */}
              <div className="absolute top-4 left-4 w-3 h-3 bg-[#0FAE96] rounded-full opacity-60 animate-pulse"></div>
              <div className="absolute top-4 right-4 w-2 h-2 bg-[#0FAE96] rounded-full opacity-40"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-[#0FAE96] rounded-full opacity-40"></div>
              <div className="absolute bottom-4 right-4 w-3 h-3 bg-[#0FAE96] rounded-full opacity-60 animate-pulse delay-500"></div>

              <img
                className="w-full h-full object-cover relative z-10 cursor-pointer"
                src={thumbnail}
                alt={`Step ${id} Video Thumbnail`}
                onClick={handlePlayClick}
              />
            </>
          ) : (
            <iframe
              className="w-full h-full relative z-10"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`}
              title={`Step ${id} Demo Video`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Bottom gradient border accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#0FAE96] to-transparent opacity-60"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col space-y-6 md:space-y-8 md:w-1/2">
        <div className="w-28 rounded-full flex justify-center items-center px-4 py-2 space-x-3 border-[1px] border-[#ffffff17] bg-[#FFFFFF05]">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-[#0FAE96] rounded-full"></div>
          <div className="text-[#0FAE96] text-sm md:text-base">Step {id}</div>
        </div>
        <div className="text-white text-xl md:text-3xl font-semibold">{title}</div>
        <div className="text-[#B6B6B6] text-sm md:text-lg leading-relaxed">{description}</div>
        {buttonText && buttonLink && (
          <Link href={buttonLink} rel="noopener noreferrer">
            <button className="rounded-xl text-white py-2.5 px-6 w-auto md:w-36 text-center bg-[#0FAE96] hover:bg-[#0c9a85] transition-colors duration-300 text-sm md:text-base font-medium">
              {buttonText}
            </button>
          </Link>
        )}
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const steps = [
  {
    id: 1,
    title: "📄 One-Click Download",
    description:
      "Our Chrome extension automatically downloads every resume the moment it appears — from LinkedIn, Indeed, Naukri, and more.",
    buttonText: "Add to Chrome",
    buttonLink: "https://chromewebstore.google.com/detail/jobform-automator-ai-hiri/odejagafiodlccfjnfcnhgpeggmbapnk",
    videoId: "ae7xvwP8qPI",
    thumbnail: "/images/download.jpeg",
  },
  {
    id: 2,
    title: "🧠 Human-Precision Parsing",
    description:
      "AI reads each resume like an expert recruiter, outputs match percentage (>98 % accuracy).",
    buttonText: "Short-list Resumes",
    buttonLink: "/hr/resumeUpload",
    videoId: "vSvcGE8_VHo",
    thumbnail: "/images/parse.jpeg",
  },
  {
    id: 3,
    title: "💬 Automated Outreach",
    description:
      "AI drafts, sends, and replies to personalised emails that double response rates.",
    buttonText: "Automate Emails",
    buttonLink: "/hr/hrEmail",
    videoId: "lT7bcvlfBiI",
    thumbnail: "/images/autocom.jpeg",
  },
  {
    id: 4,
    title: "🤖 Interview Intelligence",
    description:
      "AI interviewer asks role-specific questions, records video, scores answers, and flags top talent—bias-free.",
    buttonText: "Conduct AI Interviews",
    buttonLink: "/hr/interview",
    videoId: "Pntex6wr7WI",
    thumbnail: "/images/interview.jpeg",
  },
  {
    id: 5,
    title: "🎯 Talent Pool",
    description:
      "AI-driven talent pool system organizes candidate profiles, tracks skills, and matches top talent to roles—streamlined and efficient.",
    buttonText: "Acquire Top Talent",
    buttonLink: "/hr/talent_pool",
    videoId: "Xyzw9kqr8MJ",
    thumbnail: "/images/talent_pool.png",
  },
];

  return (
    <div className="space-y-10 bg-[#11011E] relative overflow-hidden">
      {/* Decorative blur effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#7000FF] rounded-full blur-[180px] opacity-25 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#FF00C7] rounded-full blur-[180px] opacity-25 animate-pulse delay-1000"></div>
      <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-[#0FAE96] rounded-full blur-[200px] opacity-20 animate-pulse delay-2000"></div>

      <div className="relative z-10 space-y-8 md:space-y-12 flex flex-col justify-center items-center text-center px-4 md:px-0 py-12 md:py-20">
        <div className="px-5 py-2.5 space-x-3 border-[1.5px] border-[#ffffff17] justify-center rounded-full flex items-center bg-[#FFFFFF05] hover:bg-[#FFFFFF08] transition-all duration-300">
          <div className="w-4 h-4 bg-[#0FAE96] rounded-full animate-pulse"></div>
          <div className="text-[#0FAE96] text-sm md:text-base font-medium">How it works?</div>
        </div>
        <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight">
          4 Features, 1 Goal, Great Hire.
        </h1>
        <p className="text-[#B6B6B6] max-w-3xl text-sm md:text-lg leading-relaxed">
          Why HR teams switch to Jobform Automator
        </p>
      </div>

      <div className="relative z-10 space-y-12 md:space-y-24 py-8">
        {steps.map((step, index) => (
          <Step key={step.id} {...step} imageOnLeft={index % 2 === 0} />
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;