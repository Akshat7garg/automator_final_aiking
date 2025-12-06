import { getDatabase, ref, set, get, remove } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { AppState } from '@/types/AppContext';
import { FormStep } from '@/types';
import app from '@/firebase/config';

export const saveSkillsDataToFirebase = async (uid: string, skillsData: AppState) => {
  const db = getDatabase(app);
  const skillsDataRef = ref(db, `user/${uid}/skillsData`);
  try {
    await set(skillsDataRef, skillsData);
    // console.log('Skills data saved to Firebase:', JSON.stringify(skillsData, null, 2));
  } catch (error) {
    console.error('Error saving skills data to Firebase:', error);
    throw error;
  }
};

export const fetchSkillsDataFromFirebase = async (uid: string): Promise<AppState | null> => {
  const db = getDatabase(app);
  const skillsDataRef = ref(db, `user/${uid}/skillsData`);
  try {
    const snapshot = await get(skillsDataRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      // console.log('Skills data fetched from Firebase for user:', uid, JSON.stringify(data, null, 2));

      if (!data || typeof data !== 'object') {
        console.error('Invalid Firebase data: Data is not an object');
        return null;
      }

      if (!data.learningPath || !Array.isArray(data.learningPath)) {
        console.error('Invalid or missing learningPath:', data.learningPath);
        return null;
      }

      const isValidLearningPath = data.learningPath.every((phase: any, index: number) => {
        const isValid = phase &&
          typeof phase === 'object' &&
          phase.id &&
          typeof phase.name === 'string' &&
          (Array.isArray(phase.skills) || phase.skills === undefined) &&
          typeof phase.isUnlocked === 'boolean' &&
          typeof phase.isCompleted === 'boolean' &&
          typeof phase.progress === 'number';
        if (!isValid) {
          console.warn(`Invalid phase at index ${index}:`, JSON.stringify(phase, null, 2));
        }
        return isValid;
      });

      if (!isValidLearningPath) {
        console.error('Invalid learningPath structure:', JSON.stringify(data.learningPath, null, 2));
        return null;
      }

      const userProgress = data.userProgress || initialState.userProgress;
      if (!userProgress || typeof userProgress !== 'object') {
        console.error('Invalid userProgress:', userProgress);
        return null;
      }

      userProgress.completedVideos = Array.isArray(userProgress.completedVideos) ? userProgress.completedVideos : [];
      userProgress.completedSkills = Array.isArray(userProgress.completedSkills) ? userProgress.completedSkills : [];
      userProgress.completedQuizzes = Array.isArray(userProgress.completedQuizzes) ? userProgress.completedQuizzes : [];
      userProgress.achievedMilestones = Array.isArray(userProgress.achievedMilestones) ? userProgress.achievedMilestones : [];
      userProgress.currentPhaseId = userProgress.currentPhaseId || '';

      const validatedData: AppState = {
        resume: data.resume || null,
        jobDescriptions: Array.isArray(data.jobDescriptions) ? data.jobDescriptions : [],
        formStep: data.formStep || FormStep.RESULTS,
        resumeSkills: Array.isArray(data.resumeSkills) ? data.resumeSkills : [],
        jobSkills: Array.isArray(data.jobSkills) ? data.jobSkills : [],
        missingSkills: Array.isArray(data.missingSkills) ? data.missingSkills : [],
        learningPath: data.learningPath.map((phase: any) => ({
          ...phase,
          skills: Array.isArray(phase.skills) ? phase.skills : [],
          name: phase.name || 'Unnamed Phase',
          description: phase.description || '',
          isUnlocked: phase.isUnlocked ?? false,
          isCompleted: phase.isCompleted ?? false,
          progress: phase.progress ?? 0
        })),
        userProgress,
        milestones: Array.isArray(data.milestones) ? data.milestones : initialState.milestones,
        quizzes: Array.isArray(data.quizzes) ? data.quizzes : [],
        isAnalyzing: data.isAnalyzing || false,
        isLoading: false
      };

      // console.log('Validated Firebase data:', JSON.stringify(validatedData, null, 2));
      return validatedData;
    } else {
      // console.log('No skills data found in Firebase for user:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error fetching skills data from Firebase:', error);
    return null;
  }
};

export const deleteSkillsDataFromFirebase = async (uid: string) => {
  const db = getDatabase(app);

  const skillsDataRef = ref(db, `user/${uid}/skillsData`);
  const learningTrackerRef = ref(db, `user/${uid}/learningTracker`);

  try {
    // Delete skill roadmap
    await remove(skillsDataRef);

    // Delete learning tracker
    await remove(learningTrackerRef);

    console.log('Skills + Learning Tracker deleted from Firebase for user:', uid);
  } catch (error) {
    console.error('Error deleting data from Firebase:', error);
    throw error;
  }
};


export const fetchGeminiApiKey = async (uid: string): Promise<string | null> => {
  const db = getDatabase(app);
  const apiKeyRef = ref(db, `user/${uid}/API`);
  try {
    const snapshot = await get(apiKeyRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const apiKey = data.apiKey || data.apikey;
      if (typeof apiKey === 'string') {
        // console.log('Gemini API key found for user:', uid);
        return apiKey;
      }
      console.warn('No valid API key found at user/${uid}/API');
      return null;
    }
    // console.log('No API data found for user:', uid);
    return null;
  } catch (error) {
    console.error('Error fetching Gemini API key:', error);
    throw error;
  }
};

export const fetchUserResumeData = async (uid: string): Promise<string | null> => {
  const db = getDatabase(app);
  const urdRef = ref(db, `user/${uid}/forms/keyvalues/URD`);
  try {
    const snapshot = await get(urdRef);
    if (snapshot.exists()) {
      const urd = snapshot.val();
      if (typeof urd === 'string') {
        // console.log('URD fetched for user:', uid, urd);
        return urd;
      }
      console.warn('Invalid URD data type:', typeof urd);
      return null;
    }
    // console.log('No URD found for user:', uid);
    return null;
  } catch (error) {
    console.error('Error fetching URD:', error);
    throw error;
  }
};

const initialState: AppState = {
  resume: null,
  jobDescriptions: [],
  formStep: FormStep.WELCOME,
  resumeSkills: [],
  jobSkills: [],
  missingSkills: [],
  learningPath: [],
  userProgress: {
    currentPhaseId: '',
    completedSkills: [],
    completedVideos: [],
    completedQuizzes: [],
    achievedMilestones: []
  },
  milestones: [
    {
      id: 'milestone-1',
      name: 'Getting Started',
      description: 'Begin your learning journey',
      isAchieved: false,
      requirements: ['Upload resume', 'Add job descriptions']
    },
    {
      id: 'milestone-2',
      name: 'Foundation Builder',
      description: 'Complete all fundamental skills',
      isAchieved: false,
      requirements: ['Complete Phase 1']
    },
    {
      id: 'milestone-3',
      name: 'Skill Master',
      description: 'Complete all skills in your learning path',
      isAchieved: false,
      requirements: ['Complete all phases']
    }
  ],
  quizzes: [],
  isAnalyzing: false,
  isLoading: true
};