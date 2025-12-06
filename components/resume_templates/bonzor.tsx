"use client";
import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  usePersonalDataStore,
  useCertificateStore,
  useAchievementStore,
  useExperienceStore,
  useEducationStore,
  useProjectStore,
  useLanguageStore,
  useSkillStore,
  useThemeStore,
} from "@/app/store";

export default function Resume() {
  // Access data from Zustand stores
  const { personalData } = usePersonalDataStore();
  const { certificates } = useCertificateStore();
  const { achievements } = useAchievementStore();
  const { experiences } = useExperienceStore();
  const { educations } = useEducationStore();
  const { projects } = useProjectStore();
  const { languages } = useLanguageStore();
  const { skills } = useSkillStore();

  const {
    primaryColor,
    backgroundColor,
    selectedFont,
    fontWeight,
    fontStyle,
    fontSize,
    lineHeight,
    underlineLinks,
    hideIcons,
  } = useThemeStore();

  // A4 dimensions in pixels (at 96 DPI for screen, adjusted for print)
  const basePageWidth = 794; // 210mm
  const basePageHeight = 1124; // 297mm
  const paddingTopBottom = 24; // Reduced for smaller screens
  const paddingLeftRight = 24;
  const availableContentHeight = basePageHeight - 2 * paddingTopBottom;

  // Dynamic font size based on screen size
  const responsiveFontSize = Math.max(fontSize * (window.innerWidth < 640 ? 0.8 : 1), 12);
  const headerFontSize = Math.max(responsiveFontSize - 4, 10);

  // Generate resume elements
  const generateElements = () => {
    const elements = [];
    // Same logic as original for generating elements
    // 1. Personal Header
    elements.push({
      id: "personal-header",
      type: "personal-header",
      data: personalData,
    });

    // 1. Personal Contact
    if (personalData.address || personalData.phone || personalData.email) {
      elements.push({
        id: "personal-contact",
        type: "personal-contact",
        data: personalData,
      });
    }

    // 2. Work Experience
    if (experiences.length) {
      elements.push({
        id: "experience-header",
        type: "section-header",
        section: "WORK EXPERIENCE",
      });
      experiences.forEach((exp, index) => {
        elements.push({
          id: `experience-${index}-header`,
          type: "experience-header",
          data: exp,
          section: "WORK EXPERIENCE",
        });
        if (exp.description) {
          elements.push({
            id: `experience-${index}-desc`,
            type: "experience-desc",
            data: { description: exp.description, parentId: index },
            section: "WORK EXPERIENCE",
          });
        }
      });
    }

    // 3. Projects
    if (projects.length) {
      elements.push({
        id: "projects-header",
        type: "section-header",
        section: "PROJECTS",
      });
      projects.forEach((proj, index) => {
        elements.push({
          id: `project-${index}-header`,
          type: "project-header",
          data: proj,
          section: "PROJECTS",
        });
        if (proj.description) {
          elements.push({
            id: `project-${index}-desc`,
            type: "project-desc",
            data: { text: proj.description, parentId: index },
            section: "PROJECTS",
          });
        }
      });
    }

    // 4. Skills
    if (skills.length) {
      elements.push({
        id: "skills-header",
        type: "section-header",
        section: "SKILLS",
      });
      skills.forEach((skill, index) =>
        elements.push({
          id: `skill-${index}`,
          type: "skill",
          data: skill,
          section: "SKILLS",
        })
      );
    }

    // 5. Education
    if (educations.length) {
      elements.push({
        id: "education-header",
        type: "section-header",
        section: "EDUCATION",
      });
      educations.forEach((edu, index) =>
        elements.push({
          id: `education-${index}`,
          type: "education",
          data: edu,
          section: "EDUCATION",
        })
      );
    }

    // 6. Certifications
    if (certificates.length) {
      elements.push({
        id: "certifications-header",
        type: "section-header",
        section: "CERTIFICATIONS",
      });
      certificates.forEach((certificate, index) =>
        elements.push({
          id: `certificate-${index}`,
          type: "certificate",
          data: certificate,
          section: "CERTIFICATIONS",
        })
      );
    }

    // 7. Awards & Achievements
    if (achievements.length) {
      elements.push({
        id: "awards-header",
        type: "section-header",
        section: "AWARDS",
      });
      achievements.forEach((achievement, index) =>
        elements.push({
          id: `achievement-${index}`,
          type: "achievement",
          data: achievement,
          section: "AWARDS",
        })
      );
    }

    // 8. Languages
    if (languages.length) {
      elements.push({
        id: "languages-header",
        type: "section-header",
        section: "LANGUAGES",
      });
      languages.forEach((language, index) =>
        elements.push({
          id: `language-${index}`,
          type: "language",
          data: language,
          section: "LANGUAGES",
        })
      );
    }

    return elements;
  };

  const elements = useMemo(() => generateElements(), [
    personalData,
    certificates,
    achievements,
    experiences,
    educations,
    projects,
    languages,
    skills,
  ]);

  // Render individual resume elements
  const renderElement = (element: any) => {
    const linkStyle = underlineLinks ? "underline" : "no-underline";
    const iconDisplay = hideIcons ? "hidden" : "block";

    switch (element.type) {
      case "personal-header":
        return (
          <div className="mb-4 sm:mb-6 text-center">
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-bold"
              style={{
                fontFamily: selectedFont,
                fontWeight,
                fontStyle,
                fontSize: `${responsiveFontSize}px`,
                lineHeight: lineHeight,
                color: primaryColor,
              }}
            >
              {element.data.name || "Your Name"}
            </h1>
            <h2
              className="text-sm sm:text-base md:text-lg text-gray-600 mt-1 sm:mt-2"
              style={{ fontWeight, fontStyle }}
            >
              {element.data.headline || "Your Professional Headline"}
            </h2>
          </div>
        );
      case "personal-contact":
        return (
          <section className="pt-2 sm:pt-3 mb-4 sm:mb-8" style={{ backgroundColor }}>
            <div className="flex flex-wrap justify-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2 text-xs sm:text-sm text-gray-600">
              {element.data.email && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 ${iconDisplay}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M4 4h16v16H4V4zm0 4l8 5 8-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <a
                    href={`mailto:${element.data.email}`}
                    className={`text-blue-600 ${linkStyle}`}
                  >
                    {element.data.email}
                  </a>
                </div>
              )}
              {element.data.website && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 ${iconDisplay}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 016 6 6 6 0 01-6 6 6 6 0 01-6-6 6 6 0 016-6zm0 2v8m-4-4h8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <a
                    href={`${element.data.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 ${linkStyle}`}
                  >
                    {element.data.website}
                  </a>
                </div>
              )}
              {element.data.twitter && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 ${iconDisplay}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M22 4.5a9 9 0 01-2.6.7 4.5 4.5 0 00-7.7 4c-4 0-7.5-2-10-5a4.5 4.5 0 001.5 6c-1 0-2-.3-2.5-1v.1a4.5 4.5 0 003.5 4.4 4.5 4.5 0 01-2 .1 4.5 4.5 0 004.2 3A9 9 0 012 19c2 1 4 1.5 6.5 1.5 7.5 0 12-6 12-12v-.5a8.5 8.5 0 002-2.5z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <a
                    href={`${element.data.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 ${linkStyle}`}
                  >
                    {element.data.twitter}
                  </a>
                </div>
              )}
              {element.data.linkedin && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 ${iconDisplay}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="2"
                      y="9"
                      width="4"
                      height="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="4"
                      cy="4"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <a
                    href={`${element.data.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 ${linkStyle}`}
                  >
                    {element.data.linkedin}
                  </a>
                </div>
              )}
              {element.data.phone && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 ${iconDisplay}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M3 5l4-1 2 3-3 4 5 5 4-3 3 2-1 4H5L3 5z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <a
                    href={`tel:${element.data.phone}`}
                    className={`text-blue-600 ${linkStyle}`}
                  >
                    {element.data.phone}
                  </a>
                </div>
              )}
              {element.data.address && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 ${iconDisplay}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="9"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-gray-600">{element.data.address}</p>
                </div>
              )}
              {element.data.github && (
                <div className="flex items-center space-x-1">
                  <svg
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 ${iconDisplay}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.415-4.033-1.415-.546-1.388-1.333-1.758-1.333-1.758-1.089-.745.082-.729.082-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.996.108-.775.418-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.933 0-1.311.467-2.382 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.513 11.513 0 013.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.119 3.176.77.84 1.233 1.911 1.233 3.221 0 4.61-2.807 5.625-5.48 5.922.43.372.814 1.102.814 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z"
                    />
                  </svg>
                  <a
                    href={element.data.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-600 ${linkStyle}`}
                  >
                    {element.data.github}
                  </a>
                </div>
              )}
            </div>
          </section>
        );
      case "section-header":
        return (
          <div className="border-t border-gray-200 pt-3 sm:pt-4 mb-3 sm:mb-4">
            <h3
              className="text-base sm:text-lg font-bold"
              style={{
                fontFamily: selectedFont,
                fontWeight,
                fontStyle,
                fontSize: `${headerFontSize}px`,
                lineHeight: lineHeight,
                color: primaryColor,
              }}
            >
              {element.section}
            </h3>
          </div>
        );
      case "experience-header":
        return (
          <div className="mb-2 sm:mb-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
              <div>
                <p
                  className="text-sm sm:text-base font-medium"
                  style={{ fontStyle }}
                >
                  {element.data.position}
                </p>
                <span className="text-xs sm:text-sm text-gray-600">
                  {element.data.company}, {element.data.location} | {element.data.dateRange}
                </span>
              </div>
            </div>
          </div>
        );
      case "experience-desc":
        // Return null if description is undefined or empty
        if (!element.data.description || element.data.description.trim().length === 0) {
          return null;
        }

        // Protect ".js" by replacing the period with a placeholder
        const sentences = element.data.description
          .replace(
            /(\b(?:Express|React|Node)\.js\b)/g,
            (match: string) => match.replace(".", "[DOT]")
          )
          .split(/\.\s+(?=[A-Z])/) // Split on ". " followed by a capital letter
          .map((sentence: string) =>
            sentence
              .replace(/\[DOT\]/g, ".") // Restore ".js"
              .trim()
          )
          .filter((sentence: string) => sentence.length > 0);

        return (
          <ul
            className="list-disc list-outside text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4 ml-6 print:ml-4"
            key={`experience-desc-${element.data.parentId}`}
          >
            {sentences.map((detail: string, i: number) => (
              <li key={`experience-${element.data.parentId}-desc-${i}`}>
                {detail}
                {i < sentences.length - 1 && detail.endsWith(".") ? "" : "."}
              </li>
            ))}
          </ul>
        );

      case "project-header":
        return (
          <div className="mb-2 sm:mb-3">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <a
                href={element.data.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm sm:text-base font-medium ${linkStyle}`}
              >
                {element.data.name}
              </a>
              <span className="text-xs sm:text-sm text-gray-500" style={{ fontStyle }}>
                {element.data.date}
              </span>
            </div>
          </div>
        );
      case "project-desc":
        return (
          <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
            {element.data.text}
          </p>
        );
      case "skill":
        return (
          <div className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
            <span className="font-medium">{element.data.heading}:</span>{" "}
            {element.data.items}
          </div>
        );
      case "education":
        return (
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <div>
                <div className="text-sm sm:text-base font-medium">
                  {element.data.institute}
                </div>
                <p className="text-xs sm:text-sm text-gray-600" style={{ fontStyle }}>
                  {element.data.typeofstudy} in {element.data.areaofstudy}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm text-gray-500" style={{ fontStyle }}>
                  {element.data.dateRange}
                </span>
                {element.data.score && (
                  <span className="text-xs sm:text-sm text-gray-700 block">
                    {element.data.score}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      case "certificate":
        return (
          <div className="mb-2 sm:mb-3">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-sm sm:text-base font-medium">
                {element.data.title}
              </span>
              <span className="text-xs sm:text-sm text-gray-500" style={{ fontStyle }}>
                {element.data.date}
              </span>
            </div>
            <a
              href={element.data.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs sm:text-sm ${linkStyle}`}
            >
              {element.data.awarder}
            </a>
          </div>
        );
      case "achievement":
        return (
          <div className="mb-2 sm:mb-3">
            <div className="text-sm sm:text-base font-medium">{element.data.name}</div>
            <p className="text-xs sm:text-sm text-gray-600" style={{ fontStyle }}>
              {element.data.details}
            </p>
          </div>
        );
      case "language":
        return (
          <div className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
            <span className="font-medium">{element.data.heading}:</span>{" "}
            {element.data.option}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="resume-container font-sans print:p-0 w-full">
      {/* Hidden content for measuring element heights */}
      <div
        className="absolute -top-[9999px] -left-[9999px] w-[210mm] pointer-events-none"
      >
        {elements.map((element) => (
          <div key={element.id} id={element.id} className="break-words">
            {renderElement(element)}
          </div>
        ))}
      </div>

      {/* Visible continuous content */}
      <div
        className={`content-wrapper p-6 h-auto print:p-0 print:h-auto`}
        style={{ backgroundColor }}
      >
        {elements.map((element) => (
          <div key={element.id}>{renderElement(element)}</div>
        ))}
      </div>
    </div>
  );
}