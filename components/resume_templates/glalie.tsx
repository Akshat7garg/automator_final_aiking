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

export default function Glalie() {
  const { personalData } = usePersonalDataStore();
  const { certificates } = useCertificateStore();
  const { achievements } = useAchievementStore();
  const { experiences } = useExperienceStore();
  const { educations } = useEducationStore();
  const { projects } = useProjectStore();
  const { languages } = useLanguageStore();
  const { skills } = useSkillStore();

  // 🔥 Bullet splitting logic (same as Template 1)
  const splitDescriptionIntoSentences = (text?: string) => {
    if (!text || text.trim().length === 0) return [];

    const protectedText = text.replace(
      /(\b(?:Express|React|Node)\.js\b)/g,
      m => m.replace(".", "[DOT]")
    );

    const rawSentences = protectedText
      .split(/\.\s+(?=[A-Z])/)
      .map(s => s.replace(/\[DOT\]/g, ".").trim())
      .filter(s => s.length > 0);

    return rawSentences.map(s => (s.endsWith(".") ? s : s + "."));
  };

  return (
    <div className="bg-white text-gray-800 font-sans">

      <div className="h-4 w-full rounded-xs bg-blue-400 mb-4"></div>

      {/* HEADER */}
      <header className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-semibold text-blue-400">
          {personalData.name || "Your Name"}
        </h1>

        <h2 className="text-lg text-gray-600">
          {personalData.headline || "Your Professional Headline"}
        </h2>

        {(personalData.address ||
        personalData.phone ||
        personalData.github ||
        personalData.email ||
        personalData.twitter ||
        personalData.linkedin) && (
          <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500 mt-4">
            {personalData.address && <div>{personalData.address}</div>}
            {personalData.phone && <div>{personalData.phone}</div>}

            {personalData.email && (
              <a href={`mailto:${personalData.email}`} className="hover:underline">
                {personalData.email}
              </a>
            )}

            {personalData.github && (
              <a href={personalData.github} target="_blank" className="hover:underline">
                {personalData.github}
              </a>
            )}

            {personalData.twitter && (
              <a href={personalData.twitter} target="_blank" className="hover:underline">
                {personalData.twitter}
              </a>
            )}

            {personalData.linkedin && (
              <a href={personalData.linkedin} target="_blank" className="hover:underline">
                {personalData.linkedin}
              </a>
            )}
          </div>
        )}
      </header>

      {/* CONTENT */}
      <main className="space-y-8">

        {/* WORK EXPERIENCE — Template 1 order moves this ABOVE Awards/Certificates */}
        {!!experiences.length && (
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Work Experience</h3>

            {experiences.map((exp, index) => {
              const bullets = splitDescriptionIntoSentences(exp.description);

              return (
                <div key={index} className="mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {exp.company}, {exp.location}
                    </span>
                    <span className="text-gray-500">{exp.dateRange}</span>
                  </div>

                  <p className="italic text-gray-700 text-sm mb-2">
                    {exp.position}
                  </p>

                  {!!bullets.length && (
                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                      {bullets.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* EDUCATION */}
        {!!educations.length && (
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Education</h3>

            {educations.map((edu, index) => (
              <div key={index} className="mb-3 text-sm">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{edu.institute}</div>
                    <p className="text-gray-700">
                      {edu.typeofstudy} in {edu.areaofstudy}
                    </p>
                  </div>

                  <div className="text-right text-xs text-gray-500">
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

        {/* PROJECTS */}
        {!!projects.length && (
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Projects</h3>

            {projects.map((proj, index) => (
              <div key={index} className="mb-5 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {proj.website ? (
                      <a
                        href={proj.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-gray-800 hover:text-gray-600"
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

        {/* SKILLS */}
        {!!skills.length && (
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Skills</h3>

            <div className="grid grid-cols-2 gap-6 text-sm">
              {skills.map((skill, index) => (
                <div key={index}>
                  <div className="font-medium mb-1">{skill.heading}</div>
                  <p className="text-gray-700">{skill.items}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS */}
        {!!certificates.length && (
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Certifications</h3>

            {certificates.map((certificate, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between">
                  <span className="font-medium">{certificate.title}</span>
                  <span className="text-gray-500 text-xs">{certificate.date}</span>
                </div>

                <p className="text-gray-700 text-sm">{certificate.awarder}</p>
              </div>
            ))}
          </section>
        )}

        {/* AWARDS */}
        {!!achievements.length && (
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Awards</h3>

            {achievements.map((achievement, index) => (
              <div key={index} className="mb-3">
                <div className="font-medium">{achievement.name}</div>
                <p className="text-gray-700 text-sm">{achievement.details}</p>
              </div>
            ))}
          </section>
        )}

        {/* LANGUAGES */}
        {!!languages.length && (
          <section className="pt-4 border-t border-gray-200">
            <h3 className="text-blue-400 font-semibold text-lg mb-3">Languages</h3>

            {languages.map((language, index) => (
              <div key={index} className="mb-3">
                <div className="font-medium">{language.heading}</div>
                <p className="text-gray-700 text-sm">{language.option}</p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
