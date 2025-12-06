import { Resume, JobDescription, Skill, Phase } from '@/types';
import { commonSkills, SKILL_PRIORITY } from './skillPriority';

// Escape special regex characters like + . * ? etc.
const escapeRegExp = (str: string) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Fallback implementation if AI analysis fails
export const extractSkillsFromText = (text: string): string[] => {
  const skillList = commonSkills;

  return skillList.filter(skill => {
    const escapedSkill = escapeRegExp(skill);               // Escape regex symbols
    const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i'); // Safe regex
    return regex.test(text);
  });
};

export const findSkillGaps = (
  resumeSkills: string[],
  jobSkills: string[]
): string[] => {
  const normalizedResumeSkills = resumeSkills.map(s => s.toLowerCase());
  return jobSkills.filter(
    skill => !normalizedResumeSkills.includes(skill.toLowerCase())
  );
};

export const fetchEducationalVideos = async (skill: string): Promise<{
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: number;
  progress: number;
  isCompleted: boolean;
}[]> => {
  console.log(`fetchEducationalVideos called for skill: ${skill}`);
  try {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('YouTube API key is not configured.');
      return [];
    }

    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(skill + ' tutorial')}&type=video&key=${apiKey}&maxResults=5`;
    const response = await fetch(youtubeApiUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('Error fetching videos from YouTube API:', data);
      return [];
    }

    if (!data.items || !Array.isArray(data.items)) {
      console.warn(`No valid items found in YouTube API response for skill "${skill}"`);
      return [];
    }

    const videos = data.items
      .filter((item: any) => item?.id?.videoId && item?.snippet) // Ensure videoId and snippet exist
      .map((item: any, index: number) => ({
        id: item.id.videoId || `fallback-${skill}-${index}-${Date.now()}`, // Fallback ID
        title: item.snippet.title || `Untitled Video ${index + 1}`,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || 'https://via.placeholder.com/480x360',
        duration: 'N/A', // Duration requires a separate API call to videos endpoint
        viewCount: 0, // View count requires a separate API call
        progress: 0,
        isCompleted: false
      }));

    console.log(`Fetched and sanitized videos for ${skill}:`, videos);

    return videos;
  } catch (error) {
    console.error(`Error fetching videos for ${skill}:`, error);
    return [];
  }
};

export const getVideoRecommendations = async (skills: string[]) => {
  const videoPromises = skills.map(skill =>
    fetchEducationalVideos(skill)
  );
  const videoResults = await Promise.all(videoPromises);
  return videoResults.flat();
};

export const createLearningPath = (missingSkills: string[]): Phase[] => {

  // 1. Sort skills based on logical learning order
  const sortedSkills = missingSkills.sort((a, b) => {
    const priorityA = SKILL_PRIORITY[a] ?? SKILL_PRIORITY["default"];
    const priorityB = SKILL_PRIORITY[b] ?? SKILL_PRIORITY["default"];
    return priorityA - priorityB;
  });

  // 2. Split logically into Fundamental → Intermediate → Advanced
  const fundamentalSkills = sortedSkills.slice(0, Math.ceil(sortedSkills.length / 3));
  const intermediateSkills = sortedSkills.slice(
    Math.ceil(sortedSkills.length / 3),
    Math.ceil(sortedSkills.length * 2 / 3)
  );
  const advancedSkills = sortedSkills.slice(Math.ceil(sortedSkills.length * 2 / 3));

  // 3. Build phases
  return [
    {
      id: 'phase-1',
      name: 'Fundamental Skills',
      description: 'Master these core skills first to build a strong foundation',
      skills: fundamentalSkills.map((skillName, index) => ({
        id: `skill-${index + 1}`,
        name: skillName,
        videos: [],
        isCompleted: false,
      })),
      isUnlocked: true,
      isCompleted: false,
      progress: 0
    },
    {
      id: 'phase-2',
      name: 'Intermediate Skills',
      description: 'Build upon your foundation with these intermediate-level skills',
      skills: intermediateSkills.map((skillName, index) => ({
        id: `skill-${fundamentalSkills.length + index + 1}`,
        name: skillName,
        videos: [],
        isCompleted: false,
      })),
      isUnlocked: false,
      isCompleted: false,
      progress: 0
    },
    {
      id: 'phase-3',
      name: 'Advanced Skills',
      description: 'Master these advanced skills to stand out from other candidates',
      skills: advancedSkills.map((skillName, index) => ({
        id: `skill-${fundamentalSkills.length + intermediateSkills.length + index + 1}`,
        name: skillName,
        videos: [],
        isCompleted: false,
      })),
      isUnlocked: false,
      isCompleted: false,
      progress: 0
    }
  ];
};

export const getMockVideosForSkill = (skillName: string) => {
  return [];
};

export const analyzeWithGeminiAI = async (
  resumeText: string,
  jobDescriptions: string[]
): Promise<{
  resumeSkills: string[],
  jobSkills: string[],
  missingSkills: string[]
}> => {
  try {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
      console.error('No API key found in localStorage');
      alert('Please enter your Gemini API key in the settings page');
      throw new Error('No API key found');
    }
    if (!/^[A-Za-z0-9-_]{39}$/.test(apiKey)) {
      console.error('Invalid API key format:', apiKey);
      alert('Invalid API key format - Please check your Gemini API key in settings');
      throw new Error('Invalid API key format');
    }

    const prompt = `
      I need to analyze a resume and job descriptions to identify skills and skill gaps.

      RESUME TEXT:
        ${resumeText}

      JOB DESCRIPTIONS:
        ${jobDescriptions.join('\n\n---\n\n')}

      Please extract and return the following in a JSON format:
      1. All skills mentioned in the resume
      2. All skills required in the job descriptions
      3. Skills that appear in the job descriptions but are missing from the resume

      Format your response as valid JSON with these keys:
      {
        "resumeSkills": ["skill1", "skill2", ...],
        "jobSkills": ["skill1", "skill2", ...],
        "missingSkills": ["skill1", "skill2", ...]
      }
    `;

    // Mock response for now
    const resumeSkills = extractSkillsFromText(resumeText);
    const allJobSkills = jobDescriptions
      .flatMap(text => extractSkillsFromText(text))
      .filter((skill, index, self) => self.indexOf(skill) === index);
    const missingSkills = findSkillGaps(resumeSkills, allJobSkills);

    return {
      resumeSkills,
      jobSkills: allJobSkills,
      missingSkills
    };
  } catch (error) {
    console.error('Error in Gemini analysis:', error);
    const resumeSkills = extractSkillsFromText(resumeText);
    const allJobSkills = jobDescriptions
      .flatMap(text => extractSkillsFromText(text))
      .filter((skill, index, self) => self.indexOf(skill) === index);
    const missingSkills = findSkillGaps(resumeSkills, allJobSkills);
    return {
      resumeSkills,
      jobSkills: allJobSkills,
      missingSkills
    };
  }
};