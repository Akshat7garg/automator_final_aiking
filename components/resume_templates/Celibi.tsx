"use client";
import React from "react";
import {
  usePersonalDataStore,
  useCertificateStore,
  useAchievementStore,
  useExperienceStore,
  useEducationStore,
  useProjectStore,
  useLanguageStore,
  useSkillStore,
} from "@/app/store";

export default function Celibi() {
  const { personalData } = usePersonalDataStore();
  const { certificates } = useCertificateStore();
  const { achievements } = useAchievementStore();
  const { experiences } = useExperienceStore();
  const { educations } = useEducationStore();
  const { projects } = useProjectStore();
  const { languages } = useLanguageStore();
  const { skills } = useSkillStore();

  // ---- Helper: split description into bullet-point sentences (same logic as template 1) ----
  const splitDescriptionIntoSentences = (text?: string) => {
    if (!text || text.trim().length === 0) return [];

    // Protect ".js" tech names
    const protectedText = text.replace(
      /(\b(?:Express|React|Node)\.js\b)/g,
      (match: string) => match.replace(".", "[DOT]")
    );

    const rawSentences = protectedText
      .split(/\.\s+(?=[A-Z])/)
      .map((sentence: string) =>
        sentence.replace(/\[DOT\]/g, ".").trim()
      )
      .filter((sentence: string) => sentence.length > 0);

    // Ensure each bullet ends with a period
    return rawSentences.map((s) => (s.endsWith(".") ? s : s + "."));
  };

  return (
    <div className="bg-white text-gray-800 mx-auto font-sans flex">
      {/* Sidebar Section */}
      <aside className="w-1/3 bg-gray-100 p-6 rounded-l-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-teal-700">
            {personalData.name || "Your Name"}
          </h1>
          <h2 className="text-md text-gray-600">
            {personalData.headline || "Your Professional Headline"}
          </h2>
        </div>

        <div className="mb-8">
          <h3 className="text-teal-700 font-semibold text-sm mb-3 uppercase tracking-wider">
            Contact
          </h3>
          <div className="text-sm text-gray-700 space-y-2">
            {personalData.address && <div>{personalData.address}</div>}
            {personalData.phone && <div>{personalData.phone}</div>}
            {personalData.email && (
              <div>
                <a
                  href={`mailto:${personalData.email}`}
                  className="text-teal-500 hover:underline"
                >
                  {personalData.email}
                </a>
              </div>
            )}
            {personalData.website && (
              <div>
                Website:{" "}
                <a
                  href={personalData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:underline"
                >
                  {personalData.website}
                </a>
              </div>
            )}
            {personalData.github && (
              <div>
                GitHub:{" "}
                <a
                  href={personalData.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:underline"
                >
                  {personalData.github}
                </a>
              </div>
            )}
            {personalData.linkedin && (
              <div>
                LinkedIn:{" "}
                <a
                  href={personalData.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:underline"
                >
                  {personalData.linkedin}
                </a>
              </div>
            )}
            {personalData.twitter && (
              <div>
                Twitter:{" "}
                <a
                  href={personalData.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:underline"
                >
                  {personalData.twitter}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Skills Section in Sidebar */}
        {!!skills.length && (
          <div className="mb-8">
            <h3 className="text-teal-700 font-semibold text-sm mb-3 uppercase tracking-wider">
              Skills
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              {skills.map((skill, index) => (
                <li key={index}>
                  <div className="font-medium">{skill.heading}</div>
                  {/* Keep visual structure, but logic consistent with template 1 (single line if you want) */}
                  {skill.items && (
                    <p className="text-gray-700 text-xs">
                      {skill.items}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Languages Section in Sidebar */}
        {!!languages.length && (
          <div>
            <h3 className="text-teal-700 font-semibold text-sm mb-3 uppercase tracking-wider">
              Languages
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              {languages.map((language, index) => (
                <li key={index}>
                  <div className="font-medium">{language.heading}</div>
                  <p className="text-gray-700 text-xs">{language.option}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Main Content Section */}
      <main className="w-2/3 p-6 space-y-6">
        {/* Experience Section */}
        {!!experiences.length && (
          <section>
            <h3 className="text-teal-700 font-semibold text-lg mb-4 uppercase tracking-wider">
              Experience
            </h3>
            {experiences.map((exp, index) => {
              const bullets = splitDescriptionIntoSentences(exp.description);

              return (
                <div key={index} className="mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">
                      {exp.company}, {exp.location}
                    </span>
                    <span className="text-gray-500">{exp.dateRange}</span>
                  </div>
                  <p className="italic text-gray-700 text-sm mb-2">
                    {exp.position}
                  </p>
                  {!!bullets.length && (
                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                      {bullets.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Projects Section */}
        {!!projects.length && (
          <section>
            <h3 className="text-teal-700 font-semibold text-lg mb-4 uppercase tracking-wider">
              Projects
            </h3>
            {projects.map((proj, index) => (
              <div key={index} className="mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {proj.website ? (
                      <a
                        href={proj.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-gray-800 hover:text-teal-500"
                      >
                        {proj.name}
                      </a>
                    ) : (
                      proj.name
                    )}
                  </span>
                  <span className="text-gray-500">{proj.date}</span>
                </div>
                {proj.description && (
                  <p className="text-gray-700">{proj.description}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Education Section */}
        {!!educations.length && (
          <section>
            <h3 className="text-teal-700 font-semibold text-lg mb-4 uppercase tracking-wider">
              Education
            </h3>
            {educations.map((edu, index) => (
              <div key={index} className="mb-4 text-sm">
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{edu.institute}</div>
                    <p className="text-gray-700">
                      {edu.typeofstudy} in {edu.areaofstudy}
                    </p>
                  </div>
                  <div className="text-gray-500 text-right text-xs">
                    {edu.dateRange}
                    {edu.score && (
                      <p className="text-gray-700 text-xs">{edu.score}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Certifications Section */}
        {!!certificates.length && (
          <section>
            <h3 className="text-teal-700 font-semibold text-lg mb-4 uppercase tracking-wider">
              Certifications
            </h3>
            {certificates.map((certificate, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between">
                  <span className="font-semibold">{certificate.title}</span>
                  <span className="text-gray-500 text-xs">
                    {certificate.date}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{certificate.awarder}</p>
              </div>
            ))}
          </section>
        )}

        {/* Awards Section */}
        {!!achievements.length && (
          <section>
            <h3 className="text-teal-700 font-semibold text-lg mb-4 uppercase tracking-wider">
              Awards
            </h3>
            {achievements.map((achievement, index) => (
              <div key={index} className="mb-4">
                <div className="font-semibold">{achievement.name}</div>
                <p className="text-gray-700 text-sm">
                  {achievement.details}
                </p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}