import {
  usePersonalDataStore,
  useProjectStore,
  useEducationStore,
  useCertificateStore,
  useExperienceStore,
  useSkillStore,
  useAchievementStore,
  useLanguageStore,
} from "../../app/store"; // Update path accordingly


interface PersonalData {
  [key: string]: string;
}

interface Project {
  name: string;
  description: string;
  website: string;
  date: string;
}

interface Education {
  institute: string;
  areaofstudy: string;
  typeofstudy: string;
  dateRange: string;
  score: string;
}

interface Certificate {
  title: string;
  awarder: string;
  date: string;
  link: string;
}

interface Experience {
  company: string;
  position: string;
  dateRange: string;
  location: string;
  description: string;
}

interface Skill {
  heading: string;
  items: string[];
}

interface Achievement {
  name: string;
  details: string;
}

interface Language {
  heading: string;
  option: string;
}

interface ResumeData {
  personalData?: PersonalData;
  projects?: Project[];
  educations?: Education[];
  certificates?: Certificate[];
  experiences?: Experience[];
  skills?: Skill[];
  achievements?: Achievement[];
  languages?: Language[];
}


const fillResumeData = (data: ResumeData) => {
  if (!data) return;

  const { updatePersonalData, resetPersonalData } = usePersonalDataStore.getState();
  const { addProject, resetProjects } = useProjectStore.getState();
  const { addEducation, resetEducations } = useEducationStore.getState();
  const { addCertificate, resetCertificates } = useCertificateStore.getState();
  const { addExperience, resetExperiences } = useExperienceStore.getState();
  const { addSkill, resetSkills } = useSkillStore.getState();
  const { addAchievement, resetAchievements } = useAchievementStore.getState();
  const { addLanguage, resetLanguages } = useLanguageStore.getState();

  // Reset all stores
  resetPersonalData();
  resetProjects();
  resetEducations();
  resetCertificates();
  resetExperiences();
  resetSkills();
  resetAchievements();
  resetLanguages();

  Object.entries(data.personalData || {}).forEach(([key, value]) => {
    updatePersonalData(key, value);
  });

  data.projects?.forEach((project) => {
    addProject(project.name, project.description, project.website, project.date);
  });

  data.educations?.forEach((education) => {
    addEducation(
      education.institute,
      education.areaofstudy,
      education.typeofstudy,
      education.dateRange,
      education.score
    );
  });

  data.certificates?.forEach((certificate) => {
    addCertificate(certificate.title, certificate.awarder, certificate.date, certificate.link);
  });

  data.experiences?.forEach((experience) => {
    addExperience(
      experience.company,
      experience.position,
      experience.dateRange,
      experience.location,
      experience.description
    );
  });

  data.skills?.forEach((skill) => {
    addSkill(skill.heading, skill.items);
  });

  data.achievements?.forEach((achievement) => {
    addAchievement(achievement.name, achievement.details);
  });

  data.languages?.forEach((language) => {
    addLanguage(language.heading, language.option);
  });

  console.log("Resume data filled successfully!");
};

export default fillResumeData;

