"use client";
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { saveSkillsDataToFirebase, fetchSkillsDataFromFirebase } from '@/services/firebaseService';
import { AppState } from '@/types/AppContext';
import {
  Resume,
  JobDescription,
  Phase,
  UserProgress,
  FormStep,
  Milestone,
  Quiz,
  Video
} from '@/types';
import {
  extractSkillsFromText,
  findSkillGaps,
  createLearningPath,
  analyzeWithGeminiAI,
  fetchEducationalVideos
} from '@/services/analysisService';

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
    completedVideos: [], // Ensure initialized as array
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

type AppAction =
  | { type: 'SET_RESUME'; payload: string }
  | { type: 'ADD_JOB_DESCRIPTION'; payload: { id: string; text: string; title?: string; company?: string } }
  | { type: 'REMOVE_JOB_DESCRIPTION'; payload: string }
  | { type: 'SET_FORM_STEP'; payload: FormStep }
  | { type: 'START_ANALYSIS' }
  | { type: 'COMPLETE_ANALYSIS'; payload: { resumeSkills: string[], jobSkills: string[], missingSkills: string[], learningPath: Phase[] } }
  | { type: 'UPDATE_VIDEO_PROGRESS'; payload: { skillId: string; videoId: string; progress: number } }
  | { type: 'COMPLETE_VIDEO'; payload: { skillId: string; videoId: string } }
  | { type: 'COMPLETE_SKILL'; payload: string }
  | { type: 'UNLOCK_PHASE'; payload: string }
  | { type: 'COMPLETE_PHASE'; payload: string }
  | { type: 'ACHIEVE_MILESTONE'; payload: string }
  | { type: 'SET_SKILL_VIDEOS'; payload: { skillId: string; videos: Video[] } }
  | { type: 'SET_STATE_FROM_FIREBASE'; payload: AppState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET_STATE' };

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_RESUME': {
      const skills = extractSkillsFromText(action.payload);
      if (typeof window !== 'undefined') {
        localStorage.setItem('resume', action.payload);
      }
      return {
        ...state,
        resume: {
          text: action.payload,
          skills
        }
      };
    }

    case 'ADD_JOB_DESCRIPTION': {
      const { id, text, title, company } = action.payload;
      const skills = extractSkillsFromText(text);
      const newJobDescription: JobDescription = {
        id,
        text,
        title,
        company,
        skills
      };

      return {
        ...state,
        jobDescriptions: [...state.jobDescriptions, newJobDescription]
      };
    }

    case 'REMOVE_JOB_DESCRIPTION': {
      return {
        ...state,
        jobDescriptions: state.jobDescriptions.filter(job => job.id !== action.payload)
      };
    }

    case 'SET_FORM_STEP': {
      return {
        ...state,
        formStep: action.payload
      };
    }

    case 'START_ANALYSIS': {
      return {
        ...state,
        isAnalyzing: true
      };
    }

    case 'COMPLETE_ANALYSIS': {
      if (!state.resume) {
        return state;
      }
      const { resumeSkills, jobSkills, missingSkills, learningPath } = action.payload;
      const quizzes = learningPath.map(phase => ({
        id: `quiz-${phase.id}`,
        phaseId: phase.id,
        questions: [
          {
            id: `question-1-${phase.id}`,
            question: `Which of these is a key concept in ${phase.skills[0]?.name || 'this skill'}?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswerIndex: 1
          },
          {
            id: `question-2-${phase.id}`,
            question: `What is the primary advantage of using ${phase.skills[1]?.name || 'this skill'}?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswerIndex: 0
          },
          {
            id: `question-3-${phase.id}`,
            question: `How would you implement ${phase.skills[2]?.name || 'this skill'} in a real project?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswerIndex: 2
          }
        ],
        isUnlocked: phase.isUnlocked,
        isCompleted: false,
        passingScore: 70
      }));
      return {
        ...state,
        resumeSkills,
        jobSkills,
        missingSkills,
        learningPath,
        quizzes,
        userProgress: {
          ...state.userProgress,
          currentPhaseId: learningPath[0]?.id || ''
        },
        isAnalyzing: false,
        formStep: FormStep.RESULTS,
        milestones: state.milestones.map(milestone =>
          milestone.id === 'milestone-1'
            ? { ...milestone, isAchieved: true }
            : milestone
        ),
        isLoading: false
      };
    }

    case 'UPDATE_VIDEO_PROGRESS': {
      const { skillId, videoId, progress } = action.payload;

      return {
        ...state,
        learningPath: state.learningPath.map(phase => ({
          ...phase,
          skills: phase.skills.map(skill => {
            if (skill.id !== skillId) return skill;

            return {
              ...skill,
              videos: skill.videos.map(video => {
                if (video.id !== videoId) return video;

                return {
                  ...video,
                  progress,
                  isCompleted: progress >= 90 || video.isCompleted
                };
              })
            };
          })
        }))
      };
    }

    case 'COMPLETE_VIDEO': {
      const { skillId, videoId } = action.payload;
      // console.log('COMPLETE_VIDEO:', { skillId, videoId, completedVideos: state.userProgress.completedVideos });

      const newState = {
        ...state,
        learningPath: state.learningPath.map(phase => ({
          ...phase,
          skills: phase.skills.map(skill => {
            if (skill.id !== skillId) return skill;

            return {
              ...skill,
              videos: skill.videos.map(video => {
                if (video.id !== videoId) return video;

                return {
                  ...video,
                  progress: 100,
                  isCompleted: true
                };
              })
            };
          })
        })),
        userProgress: {
          ...state.userProgress,
          completedVideos: Array.isArray(state.userProgress.completedVideos)
            ? [...state.userProgress.completedVideos, videoId]
            : [videoId] // Fallback if not an array
        }
      };

      const skillToCheck = newState.learningPath
        .flatMap(phase => phase.skills)
        .find(skill => skill.id === skillId);

      if (skillToCheck && skillToCheck.videos.every(video => video.isCompleted)) {
        return appReducer(newState, { type: 'COMPLETE_SKILL', payload: skillId });
      }

      return newState;
    }

    case 'COMPLETE_SKILL': {
      const skillId = action.payload;
      const newState = {
        ...state,
        learningPath: state.learningPath.map(phase => ({
          ...phase,
          skills: phase.skills.map(skill => {
            if (skill.id !== skillId) return skill;
            return {
              ...skill,
              isCompleted: true,
              videos: skill.videos.map(video => ({
                ...video,
                isCompleted: true,
                progress: 100
              }))
            };
          })
        })),
        userProgress: {
          ...state.userProgress,
          completedSkills: Array.isArray(state.userProgress.completedSkills)
            ? [...state.userProgress.completedSkills, skillId]
            : [skillId],
          completedVideos: [
            ...(Array.isArray(state.userProgress.completedVideos) ? state.userProgress.completedVideos : []),
            ...state.learningPath
              .flatMap(phase => phase.skills)
              .find(skill => skill.id === skillId)
              ?.videos
              .map(video => video.id) || []
          ]
        }
      };
      const updatedPath = newState.learningPath.map(phase => ({
        ...phase,
        progress: calculatePhaseProgress(phase.skills)
      }));
      for (const phase of updatedPath) {
        if (phase.skills.every(skill => skill.isCompleted) && !phase.isCompleted) {
          const phaseIndex = updatedPath.findIndex(p => p.id === phase.id);
          return {
            ...newState,
            learningPath: updatedPath.map((p, index) => ({
              ...p,
              isCompleted: p.id === phase.id ? true : p.isCompleted,
              isUnlocked: index === phaseIndex + 1 ? true : p.isUnlocked
            })),
            quizzes: newState.quizzes.map(quiz => ({
              ...quiz,
              isUnlocked: quiz.phaseId === phase.id ? true : quiz.isUnlocked
            })),
            milestones: newState.milestones.map(milestone => {
              if (
                milestone.id === 'milestone-2' &&
                phase.id === 'phase-1'
              ) {
                return { ...milestone, isAchieved: true };
              }
              if (
                milestone.id === 'milestone-3' &&
                phase.id === 'phase-3'
              ) {
                return { ...milestone, isAchieved: true };
              }
              return milestone;
            })
          };
        }
      }
      return {
        ...newState,
        learningPath: updatedPath
      };
    }

    case 'UNLOCK_PHASE': {
      const phaseId = action.payload;

      return {
        ...state,
        learningPath: state.learningPath.map(phase => ({
          ...phase,
          isUnlocked: phase.id === phaseId ? true : phase.isUnlocked
        })),
        quizzes: state.quizzes.map(quiz => ({
          ...quiz,
          isUnlocked: quiz.phaseId === phaseId ? true : quiz.isUnlocked
        }))
      };
    }

    case 'COMPLETE_PHASE': {
      const phaseId = action.payload;

      const phaseIndex = state.learningPath.findIndex(phase => phase.id === phaseId);
      const nextPhaseIndex = phaseIndex + 1;

      return {
        ...state,
        learningPath: state.learningPath.map((phase, index) => ({
          ...phase,
          isCompleted: phase.id === phaseId ? true : phase.isCompleted,
          isUnlocked: index === nextPhaseIndex ? true : phase.isUnlocked
        })),
        userProgress: {
          ...state.userProgress,
          currentPhaseId:
            nextPhaseIndex < state.learningPath.length
              ? state.learningPath[nextPhaseIndex].id
              : state.userProgress.currentPhaseId
        }
      };
    }

    case 'ACHIEVE_MILESTONE': {
      const milestoneId = action.payload;

      return {
        ...state,
        milestones: state.milestones.map(milestone => ({
          ...milestone,
          isAchieved: milestone.id === milestoneId ? true : milestone.isAchieved
        })),
        userProgress: {
          ...state.userProgress,
          achievedMilestones: Array.isArray(state.userProgress.achievedMilestones)
            ? [...state.userProgress.achievedMilestones, milestoneId]
            : [milestoneId]
        }
      };
    }

    case 'SET_SKILL_VIDEOS': {
      const { skillId, videos } = action.payload;
      return {
        ...state,
        learningPath: state.learningPath.map(phase => ({
          ...phase,
          skills: phase.skills.map(skill => ({
            ...skill,
            videos: skill.id === skillId ? videos : skill.videos
          }))
        }))
      };
    }

    case 'SET_STATE_FROM_FIREBASE': {
      // console.log('Setting state from Firebase:', JSON.stringify(action.payload, null, 2));
      return {
        ...state,
        ...action.payload,
        formStep: FormStep.RESULTS,
        isLoading: false
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload
      };
    }

    case 'RESET_STATE': {
      return initialState;
    }


    default:
      return state;
  }
};

const calculatePhaseProgress = (skills: any[]): number => {
  if (skills.length === 0) return 0;
  const completedSkills = skills.filter(skill => skill.isCompleted).length;
  return Math.round((completedSkills / skills.length) * 100);
};

interface AppContextProps {
  state: AppState;
  setResume: (text: string) => void;
  addJobDescription: (text: string, title?: string, company?: string) => void;
  removeJobDescription: (id: string) => void;
  setFormStep: (step: FormStep) => void;
  analyzeData: () => Promise<void>;
  updateVideoProgress: (skillId: string, videoId: string, progress: number) => void;
  completeVideo: (skillId: string, videoId: string) => void;
  completeSkill: (skillId: string) => void;
  resetState: () => Promise<void>;
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const router = useRouter();
  const pathname = usePathname();
  const auth = getAuth();

  // Load resume and skills data from localStorage and Firebase on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedResume = localStorage.getItem('resume');
    if (savedResume && !state.resume) {
      // console.log('Loading resume from localStorage:', savedResume);
      dispatch({ type: 'SET_RESUME', payload: savedResume });
    }

    // Wait for auth state to resolve
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // console.log('Auth state changed:', user ? `User ${user.uid}` : 'No user');
      dispatch({ type: 'SET_LOADING', payload: true });

      if (user) {
        try {
          const skillsData = await fetchSkillsDataFromFirebase(user.uid);
          if (skillsData) {
            dispatch({ type: 'SET_STATE_FROM_FIREBASE', payload: skillsData });
          } else {
            console.warn('No valid skills data found for user:', user.uid);
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } catch (error) {
          console.error('Failed to fetch skills data:', error);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('No authenticated user, skipping Firebase fetch');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => unsubscribe();
  }, []);

  // Save state to Firebase when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const user = auth.currentUser;
    if (user && state.formStep === FormStep.RESULTS && !state.isLoading) {
      saveSkillsDataToFirebase(user.uid, state).catch(error => {
        console.error('Failed to save skills data to Firebase:', error);
      });
    }
  }, [state]);

  // Debug state changes
  useEffect(() => {
    // console.log('AppContext state:', JSON.stringify(state, null, 2));
  }, [state]);

  const setResume = (text: string) => {
    dispatch({ type: 'SET_RESUME', payload: text });
  };

  const addJobDescription = (text: string, title?: string, company?: string) => {
    const id = `job-${Date.now()}`;
    dispatch({
      type: 'ADD_JOB_DESCRIPTION',
      payload: { id, text, title, company }
    });
  };

  const removeJobDescription = (id: string) => {
    dispatch({ type: 'REMOVE_JOB_DESCRIPTION', payload: id });
  };

  const setFormStep = (step: FormStep) => {
    dispatch({ type: 'SET_FORM_STEP', payload: step });
  };

  const analyzeData = async () => {
    dispatch({ type: 'START_ANALYSIS' });

    if (!state.resume) {
      console.error('Missing resume');
      dispatch({ type: 'SET_FORM_STEP', payload: FormStep.RESUME });
      router.push('/course/resumeUpload');
      return;
    }
    if (state.jobDescriptions.length === 0) {
      console.error('Missing job descriptions');
      dispatch({ type: 'SET_FORM_STEP', payload: FormStep.JOB_DESCRIPTIONS });
      router.push('/course/jobdescription');
      return;
    }

    try {
      const jobDescriptionTexts = state.jobDescriptions.map(job => job.text);
      const analysisResult = await analyzeWithGeminiAI(
        state.resume.text,
        jobDescriptionTexts
      );

      let learningPath = createLearningPath(analysisResult.missingSkills);
      learningPath = await Promise.all(
        learningPath.map(async (phase) => ({
          ...phase,
          skills: await Promise.all(
            phase.skills.map(async (skill) => ({
              ...skill,
              videos: await fetchEducationalVideos(skill.name),
            })),
          ),
        }))
      );

      dispatch({
        type: 'COMPLETE_ANALYSIS',
        payload: { ...analysisResult, learningPath }
      });
      router.push('/course/dashboard');
    } catch (error) {
      console.error('Error during analysis:', error);
      const resumeSkills = state.resume ? extractSkillsFromText(state.resume.text) : [];
      const allJobSkills = state.jobDescriptions
        .flatMap(job => job.skills)
        .filter((skill, index, self) => self.indexOf(skill) === index);
      const missingSkills = findSkillGaps(resumeSkills, allJobSkills);

      let learningPath = createLearningPath(missingSkills);
      learningPath = await Promise.all(
        learningPath.map(async (phase) => ({
          ...phase,
          skills: await Promise.all(
            phase.skills.map(async (skill) => ({
              ...skill,
              videos: await fetchEducationalVideos(skill.name),
            })),
          ),
        }))
      );

      dispatch({
        type: 'COMPLETE_ANALYSIS',
        payload: {
          resumeSkills,
          jobSkills: allJobSkills,
          missingSkills,
          learningPath
        }
      });
      router.push('/course/dashboard');
    }
  };

  const updateVideoProgress = (skillId: string, videoId: string, progress: number) => {
    dispatch({
      type: 'UPDATE_VIDEO_PROGRESS',
      payload: { skillId, videoId, progress }
    });
  };

  const completeVideo = (skillId: string, videoId: string) => {
    dispatch({
      type: 'COMPLETE_VIDEO',
      payload: { skillId, videoId }
    });
  };

  const completeSkill = (skillId: string) => {
    dispatch({ type: 'COMPLETE_SKILL', payload: skillId });
  };

  const resetState = async () => {
    dispatch({ type: 'RESET_STATE' });

    if (typeof window !== 'undefined') {
      localStorage.removeItem('resume');
    }

    const user = auth.currentUser;
    if (user) {
      try {
        await saveSkillsDataToFirebase(user.uid, initialState);
      } catch (error) {
        console.error('Failed to clear Firebase data:', error);
      }
    }

    router.push('/course/jobdescription');
  };

  return (
    <AppContext.Provider
      value={{
        state,
        setResume,
        addJobDescription,
        removeJobDescription,
        setFormStep,
        analyzeData,
        updateVideoProgress,
        completeVideo,
        completeSkill,
        resetState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};