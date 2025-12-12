import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Candidate } from '@/types/candidate';
import { processInBatches } from '@/utils/batchHelper';
import { storage } from '@/firebase/config';
import { ref as storageRefUtil, uploadBytes, getDownloadURL } from 'firebase/storage';
import dotenv from 'dotenv';
import app from '@/firebase/config';
import { getDatabase, set, ref as databaseRefUtil } from 'firebase/database';
// Use pdf2json for text extraction
import PDFParser from 'pdf2json';

dotenv.config();

// --- Gemini Configuration ---
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
if (!apiKey) {
  console.error("FATAL ERROR: NEXT_PUBLIC_GEMINI_API_KEY is not set.");
}
const genAI = new GoogleGenerativeAI(apiKey);

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// --- PDF Text Extraction (using pdf2json and temporary files) ---
const extractTextFromPdf = async (file: File): Promise<string> => {
  let tempFilePath: string | undefined;

  try {
    if (file.type !== 'application/pdf') {
      throw new Error(`Invalid file type: ${file.type} for ${file.name}`);
    }

    // Get system temp directory and create a unique temporary path
    const tempDir = os.tmpdir();
    const uniqueFileName = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    tempFilePath = path.join(tempDir, uniqueFileName);

    console.log(`Creating temp file: ${tempFilePath} for ${file.name}`);

    // Read file content into ArrayBuffer and write to temp file
    const buffer = await file.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(buffer));
    console.log(`Temp file written: ${tempFilePath}`);

    // Use pdf2json to extract text
    const pdfParser = new PDFParser();
    let extractedText = '';

    // Wrap pdf2json's event-based parsing in a Promise
    await new Promise<void>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData: { parserError: Error }) => {
        console.error(`pdf2json error for ${file.name}:`, errData.parserError);
        reject(errData.parserError);
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        console.log(`pdf2json finished parsing ${file.name}`);
        // Extract text from pages
        if (pdfData && pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const text of page.Texts) {
                // Decode URI-encoded text and append
                const textContent = decodeURIComponent(text.R[0].T);
                extractedText += textContent + ' ';
              }
            }
          }
        }
        resolve();
      });

      // Parse the temporary file
      pdfParser.loadPDF(tempFilePath as string);
    });

    console.log(`Extracted text (${extractedText.length} chars) from ${file.name} using pdf2json.`);

    // Check extracted text length
    if (!extractedText || extractedText.trim().length < 50) {
      console.warn(`Insufficient text extracted from ${file.name}: ${extractedText?.length || 0} characters.`);
    }

    return extractedText.trim();

  } catch (error) {
    console.error(`Error processing PDF ${file.name} with pdf2json:`, error);
    if (tempFilePath) {
      try {
        await fs.access(tempFilePath);
        console.log(`Cleaning up temp file on error: ${tempFilePath}`);
        await fs.unlink(tempFilePath);
      } catch (cleanupErr) {
        if ((cleanupErr as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`Error deleting temp file ${tempFilePath} in extractTextFromPdf catch block:`, cleanupErr);
        } else {
          console.log(`Temp file already deleted or not found on error: ${tempFilePath}`);
        }
      }
    }
    throw new Error(`Failed to extract text from PDF '${file.name}': ${(error as Error).message}`);
  } finally {
    if (tempFilePath) {
      try {
        await fs.access(tempFilePath);
        console.log(`Cleaning up temp file in finally: ${tempFilePath}`);
        await fs.unlink(tempFilePath);
      } catch (cleanupErr) {
        if ((cleanupErr as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`Error deleting temp file ${tempFilePath} in extractTextFromPdf finally block:`, cleanupErr);
        } else {
          console.log(`Temp file already deleted or not found in finally: ${tempFilePath}`);
        }
      }
    }
  }
};

// --- Gemini Helper Functions ---
const cleanGeminiJson = (raw: string): string => {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    const codeBlockEnd = cleaned.indexOf('```', 3);
    if (codeBlockEnd !== -1) {
      const firstNewlineAfterCodeBlock = cleaned.indexOf('\n', 3);
      if (firstNewlineAfterCodeBlock !== -1 && firstNewlineAfterCodeBlock < codeBlockEnd) {
        cleaned = cleaned.substring(firstNewlineAfterCodeBlock + 1, codeBlockEnd).trim();
      } else {
        cleaned = cleaned.substring(3, codeBlockEnd).trim();
      }
    } else {
      const firstNewlineAfterCodeBlock = cleaned.indexOf('\n');
      if (firstNewlineAfterCodeBlock !== -1) {
        cleaned = cleaned.substring(firstNewlineAfterCodeBlock + 1).trim();
      } else {
        cleaned = cleaned.substring(3).trim();
      }
    }
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3).trim();
  }
  return cleaned;
};

const validateCandidate = (candidate: Omit<Candidate, 'id' | 'approved' | 'resumeUrl'>): Omit<Candidate, 'id' | 'approved' | 'resumeUrl'> => {
  // Normalize email to lowercase before validation
  const emailInput = candidate.email && typeof candidate.email === 'string' ? candidate.email.trim().toLowerCase() : '';
  // Use case-insensitive regex for email validation
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const email = emailInput && emailRegex.test(emailInput)
    ? emailInput
    : `${candidate.name.trim().replace(/\s+/g, "").toLocaleLowerCase()}@gmail.com`;

  return {
    name: candidate.name && typeof candidate.name === 'string' && candidate.name.trim() !== '' && candidate.name.trim().toLowerCase() !== 'n/a' ? candidate.name.trim() : 'Unknown',
    email: email,
    phone: candidate.phone && typeof candidate.phone === 'string' && candidate.phone.trim() !== '' && candidate.phone.trim().toLowerCase() !== 'n/a' ? candidate.phone.trim() : 'N/A',
    location: candidate.location && typeof candidate.location === 'string' && candidate.location.trim() !== '' && candidate.location.trim().toLowerCase() !== 'n/a' ? candidate.location.trim() : 'N/A',
    score: typeof candidate.score === 'number' ? Math.max(0, Math.min(100, Math.round(candidate.score))) : 0,
    parsedText: candidate.parsedText && typeof candidate.parsedText === 'string' && candidate.parsedText.trim() ? candidate.parsedText.trim() : 'No summary provided.',
    skills: Array.isArray(candidate.skills) ? candidate.skills.filter(s => typeof s === 'string' && s.trim() !== '').map(s => s.trim()) : [],
    experience: typeof candidate.experience === 'number' && candidate.experience >= 0 ? Math.round(candidate.experience) : 0,
    jobTitle: candidate.jobTitle && typeof candidate.jobTitle === 'string' && candidate.jobTitle.trim() !== '' && candidate.jobTitle.trim().toLowerCase() !== 'n/a' ? candidate.jobTitle.trim() : 'N/A',
    education: candidate.education && typeof candidate.education === 'string' && candidate.education.trim() !== '' && candidate.education.trim().toLowerCase() !== 'n/a' ? candidate.education.trim() : 'N/A',
    uploadedAt: ''
  };
};

// --- Extract Email from Text ---
const extractEmailFromText = (text: string): string | null => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const matches = text.match(emailRegex);
  return matches && matches.length > 0 ? matches[0].toLowerCase() : null;
};

const parseWithGemini = async (
  text: string,
  jobDescription: string,
  recruiterSuggestion: string
): Promise<Omit<Candidate, 'id' | 'approved' | 'resumeUrl'>> => {
  const prompt = `
  **You are an Advanced AI Resume Evaluator.**
  
  **Your Task:**
  Critically evaluate the provided resume text against the given job description (JD) and specific recruiter suggestions (RS). Your evaluation must equally weigh the alignment with the JD (50%) and the alignment with the RS (50%) to generate a final score and detailed analysis.
  
  **Inputs:**
  
  1.  **Job Description (Weight: 50%):**
      \`\`\`
      ${jobDescription}
      \`\`\`
  
  2.  **Recruiter Suggestions (Weight: 50%):**
      \`\`\`
      ${recruiterSuggestion}
      \`\`\`
  
  3.  **Resume Text:**
      \`\`\`
      ${text}
      \`\`\`
  
  **Evaluation Process & Scoring Guidelines:**
  
  1.  **Analyze Job Description:** Identify core requirements, essential skills (technical & soft), required experience (years, type), specific tools/technologies, key responsibilities, and educational prerequisites mentioned in the JD.
  2.  **Analyze Recruiter Suggestions:** Identify specific points of emphasis, desired candidate attributes, potential red flags to watch for, and any formatting or content preferences mentioned in the RS.
  3.  **Analyze Resume:** Extract candidate's contact information, location, work experience (roles, duration, responsibilities, achievements), listed skills, and education.
  4.  **JD Match Assessment (50% Weight):**
      *   Assess the direct match between the candidate's skills/experience and the JD's essential requirements.
      *   Evaluate the relevance and depth of the candidate's experience concerning the JD's responsibilities.
      *   Check for the presence of keywords, tools, and technologies specified in the JD.
      *   Consider the alignment of education and years of experience with JD requirements.
      *   Assign a score out of 100 for JD fit.
  5.  **RS Match Assessment (50% Weight):**
      *   Assess how well the resume addresses the specific points, priorities, and concerns raised in the RS.
      *   Evaluate if the resume avoids any red flags mentioned by the recruiter.
      *   Check if the resume presentation or content aligns with the recruiter's preferences (if specified).
      *   Assign a score out of 100 for RS fit.
  6.  **Calculate Final Score:** Compute the final score as \`(JD Match Score * 0.5) + (RS Match Score * 0.5)\`. Round to the nearest whole number.
  7.  **Synthesize Evaluation Summary:** Write a concise summary (\`parsedText\`) explaining the final score. Highlight key strengths (points of strong alignment with both JD and RS) and weaknesses (significant gaps or areas where the resume fails to meet JD requirements or RS expectations). Be specific.
  
  **Output Format:**
  
  Return **only** a JSON object adhering strictly to the following structure. Do not include any text before or after the JSON object.
  
  \`\`\`json
  {
    "name": "Candidate Name (Extract from resume)",
    "email": "example@email.com (Extract from resume)",
    "phone": "+1234567890 (Extract from resume)",
    "location": "City, State/Country (Extract from resume)",
    "score": /* Calculated final score (0-100) */,
    "parsedText": "Concise summary explaining the score, highlighting specific strengths and weaknesses based on JD and RS alignment.",
    "skills": [ /* List of relevant skills extracted from the resume that match JD/RS requirements */ ],
    "experienceYears": /* Total years of relevant experience inferred/extracted from resume */,
    "jobTitle": "Most recent relevant job title (Extract from resume)",
    "education": "Highest relevant degree/qualification (Extract from resume)"
  }
  \`\`\`
  `;

  try {
    if (!apiKey) {
      console.error("Gemini API key is not configured.");
      return validateCandidate({
        name: 'API Key Missing',
        email: `api_key_missing_${uuidv4()}@example.com`,
        phone: 'N/A',
        location: 'N/A',
        score: 0,
        parsedText: 'Gemini API Key is not configured.',
        skills: [],
        experience: 0,
        jobTitle: 'API Key Missing',
        education: 'N/A',
        uploadedAt: ''
      });
    }

    // Extract email from text as a fallback
    const extractedEmail = extractEmailFromText(text);
    console.log(`Extracted email from text: ${extractedEmail || 'None'}`);

    // Truncate text if too long to avoid token limits
    const safetyMargin = 50000;
    const approxPromptTokens = Math.ceil((prompt.length + jobDescription.length + recruiterSuggestion.length) / 4);
    const maxTextTokens = 1000000 - approxPromptTokens - safetyMargin;
    const maxTextChars = maxTextTokens * 3;

    if (text.length > maxTextChars) {
      console.warn(`Resume text length (${text.length} chars) exceeds approximate limit (${maxTextChars} chars). Truncating resume text for prompt.`);
      text = text.substring(0, maxTextChars);
    } else {
      console.log(`Resume text length (${text.length} chars) is within approximate limit.`);
    }

    console.log("Attempting Gemini generateContent call...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Embed text correctly within the markdown block for Gemini
    const promptWithText = prompt.replace('```\n      ${text}\n      ```', '```json\n' + text + '\n```');

    const result = await model.generateContent(promptWithText);

    if (!result || !result.response) {
      console.error("Gemini API returned an unexpected empty result or response.");
      return validateCandidate({
        name: 'API No Response',
        email: extractedEmail || `api_no_response_${uuidv4()}@example.com`,
        phone: 'N/A',
        location: 'N/A',
        score: 0,
        parsedText: 'Gemini API returned no response.',
        skills: [],
        experience: 0,
        jobTitle: 'API Error',
        education: 'N/A',
        uploadedAt: ''
      });
    }

    const raw = result.response.text();
    const cleaned = cleanGeminiJson(raw);

    console.log("Gemini Raw Output (partial):", raw.length <= 500 ? raw : raw.substring(0, 500) + '...');
    console.log("Gemini Cleaned Output (partial):", cleaned.length <= 500 ? cleaned : cleaned.substring(0, 500) + '...');

    if (!raw || cleaned.trim() === '') {
      console.error("Gemini returned empty or whitespace-only content after cleaning.");
      console.error("Gemini Raw Output (before cleaning):", raw);
      return validateCandidate({
        name: 'Empty AI Response',
        email: extractedEmail || `empty_ai_response_${uuidv4()}@example.com`,
        phone: 'N/A',
        location: 'N/A',
        score: 0,
        parsedText: 'Gemini returned empty content.',
        skills: [],
        experience: 0,
        jobTitle: 'Empty Response',
        education: 'N/A',
        uploadedAt: ''
      });
    }

    try {
      const parsed = JSON.parse(cleaned);
      return validateCandidate({
        name: parsed.name || 'N/A',
        email: extractedEmail || parsed.email || 'N/A',
        phone: parsed.phone || 'N/A',
        location: parsed.location || 'N/A',
        score: parsed.score || 0,
        parsedText: parsed.parsedText || 'No summary provided.',
        skills: parsed.skills || [],
        experience: parsed.experienceYears || 0,
        jobTitle: parsed.jobTitle || 'N/A',
        education: parsed.education || 'N/A',
        uploadedAt: ''
      });
    } catch (jsonParseError) {
      console.error('Failed to parse Gemini output as JSON:', jsonParseError);
      console.error('Raw output causing JSON parse error:', cleaned);
      return validateCandidate({
        name: 'JSON Parse Failed',
        email: extractedEmail || `json_parse_failed_${uuidv4()}@example.com`,
        phone: 'N/A',
        location: 'N/A',
        score: 0,
        parsedText: `Failed to parse Gemini output as JSON: ${(jsonParseError as Error).message}. Raw: ${cleaned.substring(0, 200)}...`,
        skills: [],
        experience: 0,
        jobTitle: 'JSON Parse Failed',
        education: 'N/A',
        uploadedAt: ''
      });
    }
  } catch (error) {
    console.error('Gemini parsing failed:', (error as Error).message, error);
    const extractedEmail = extractEmailFromText(text);
    if (error instanceof Error && error.message.includes('safety ratings')) {
      console.error('Gemini blocked content due to safety ratings.');
      return validateCandidate({
        name: 'Content Blocked',
        email: extractedEmail || `content_blocked_${uuidv4()}@example.com`,
        phone: 'N/A',
        location: 'N/A',
        score: 0,
        parsedText: `Gemini blocked the resume content due to safety policy violation.`,
        skills: [],
        experience: 0,
        jobTitle: 'Content Blocked',
        education: 'N/A',
        uploadedAt: ''
      });
    }

    return validateCandidate({
      name: 'Parsing Failed',
      email: extractedEmail || `parsing_failed_${uuidv4()}@example.com`,
      phone: 'N/A',
      location: 'N/A',
      score: 0,
      parsedText: `Automatic parsing failed: ${(error as Error).message}.`,
      skills: [],
      experience: 0,
      jobTitle: 'Parsing Failed',
      education: 'N/A',
      uploadedAt: ''
    });
  }
};

// --- Firebase Storage Upload ---
const uploadToFirebaseStorage = async (file: File, candidateId: string): Promise<string> => {
  try {
    const buffer = await file.arrayBuffer();
    const originalFileName = file.name || `resume-${candidateId}.pdf`;
    const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueFileName = `${candidateId}_${Date.now()}_${sanitizedFileName}`;

    const storageReference = storageRefUtil(storage, `Resume/${uniqueFileName}`);
    console.log(`Attempting to upload ${file.name} to ${storageReference.fullPath}`);

    const contentType = file.type || 'application/pdf';
    await uploadBytes(storageReference, buffer, { contentType });
    const downloadURL = await getDownloadURL(storageReference);
    console.log(`Successfully uploaded to: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading file ${file.name} to Firebase:`, error);
    throw new Error(`Failed to upload file '${file.name}' to Firebase: ${(error as Error).message}`);
  }
};

// --- Firebase Realtime Database Save ---
const saveCandidateToRealtimeDatabase = async (candidate: Candidate) => {
  try {
    if (candidate.name === 'API Key Missing' || candidate.email.startsWith('api_key_missing_')) {
      console.warn(`Skipping saving candidate ${candidate.id} to DB due to API key error.`);
      return;
    }

    const candidateRef = databaseRefUtil(getDatabase(app), `talent_pool/${candidate.id}`);
    const dataToSave = {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      score: candidate.score,
      parsedText: candidate.parsedText,
      skills: candidate.skills,
      experience: candidate.experience,
      jobTitle: candidate.jobTitle,
      education: candidate.education,
      approved: candidate.approved,
      resumeUrl: candidate.resumeUrl,
    };

    await set(candidateRef, dataToSave);
    console.log(`✅ Candidate ${candidate.id} saved successfully`);
  } catch (error) {
    console.error(`❌ Error saving candidate ${candidate.id} to Realtime Database:`, error);
  }
};

// --- Next.js API Route Handler ---
export async function POST(req: NextRequest) {
  console.log('POST request received to app/api/parseresume');
  let files: File[] = [];

  try {
    const formData = await req.formData();
    console.log("FormData parsed.");

    files = formData.getAll('file') as File[];
    console.log(`Found ${files.length} potential file entries from form data.`);

    const pdfFiles = files.filter(file => file instanceof File && file.size > 0 && file.type === 'application/pdf');
    console.log(`Found ${pdfFiles.length} valid PDF files to process.`);

    if (pdfFiles.length === 0) {
      return NextResponse.json({
        success: true,
        totalProcessed: 0,
        candidates: [],
        message: "No valid PDF files were uploaded or found with the name 'file'."
      }, { status: 200 });
    }

    const url = new URL(req.url);
    const jobDescription = url.searchParams.get('jd') || '';
    const recruiterSuggestion = url.searchParams.get('rs') || '';
    console.log("JD (partial):", jobDescription.substring(0, Math.min(jobDescription.length, 100)) + (jobDescription.length > 100 ? '...' : ''));
    console.log("RS (partial):", recruiterSuggestion.substring(0, Math.min(recruiterSuggestion.length, 100)) + (recruiterSuggestion.length > 100 ? '...' : ''));

    const candidates = await processInBatches<File, Candidate>(
      pdfFiles,
      5,
      async (batch) => {
        const batchResults: Candidate[] = [];
        console.log(`Processing batch of ${batch.length} files...`);

        for (const file of batch) {
          if (!file) {
            console.warn(`Skipping invalid file entry in batch.`);
            continue;
          }

          console.log(`Processing file: ${file.name} (Size: ${file.size} bytes)`);

          let candidate: Candidate | null = null;
          const id = uuidv4();

          try {
            const text = await extractTextFromPdf(file);

            if (!text || text.trim().length < 50) {
              console.warn(`Skipping file ${file.name}: insufficient or invalid text content (${text?.length || 0} characters)`);
              candidate = {
                id: id,
                name: 'Insufficient Text',
                email: `insufficient_text_${uuidv4()}@example.com`,
                phone: 'N/A',
                location: 'N/A',
                score: 0,
                parsedText: 'Could not extract enough text from the PDF, or the PDF format was unreadable.',
                skills: [],
                experience: 0,
                jobTitle: 'N/A',
                education: 'N/A',
                approved: false,
                resumeUrl: 'N/A',
                uploadedAt: new Date().toISOString(),
              };
              await saveCandidateToRealtimeDatabase(candidate);
              batchResults.push(candidate);
              continue;
            }
            console.log(`Text extracted (${text.length} chars) from ${file.name}.`);

            console.log(`Sending text from ${file.name} to Gemini...`);
            const parsedCandidateData = await parseWithGemini(text, jobDescription, recruiterSuggestion);

            candidate = {
              ...parsedCandidateData,
              id: id,
              approved: false,
              resumeUrl: 'N/A',
              uploadedAt: new Date().toISOString(),
            };
            console.log(`Gemini parsing attempted for ${file.name}. Result name: ${candidate.name}, Score: ${candidate.score}`);

            try {
              const resumeUrl = await uploadToFirebaseStorage(file, id);
              candidate.resumeUrl = resumeUrl;
              console.log(`Uploaded ${file.name}. URL: ${resumeUrl}`);
            } catch (uploadError) {
              console.error(`Failed to upload ${file.name} to storage:`, uploadError);
              candidate.resumeUrl = 'Upload Failed';
            }

            await saveCandidateToRealtimeDatabase(candidate);
            batchResults.push(candidate);
            console.log(`Finished processing and potentially saving candidate from ${file.name}`);

          } catch (err) {
            const errorMessage = (err as Error).message || 'An unexpected error occurred during file processing.';
            console.error(`Error processing file ${file.name}:`, errorMessage);

            if (!candidate) {
              candidate = {
                id: id,
                name: 'Processing Error',
                email: `processing_error_${uuidv4()}@example.com`,
                phone: 'N/A',
                location: 'N/A',
                score: 0,
                parsedText: `An error occurred during processing this file ('${file.name}'): ${errorMessage}`,
                skills: [],
                experience: 0,
                jobTitle: 'Error',
                education: 'N/A',
                approved: false,
                resumeUrl: 'N/A',
                uploadedAt: new Date().toISOString()
              };
            } else if (candidate.resumeUrl === undefined) {
              candidate.resumeUrl = 'Upload Failed';
            }

            await saveCandidateToRealtimeDatabase(candidate);
            batchResults.push(candidate);
            console.log(`Added error candidate from ${file.name} to batch results.`);
          }
        }

        if (batchResults.length > 0) {
          console.log(`Batch processed. Waiting 5 seconds before next batch...`);
          await delay(5000);
        }

        return batchResults;
      }
    );

    const sortedCandidates = candidates.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      totalProcessed: candidates.length,
      candidates: sortedCandidates,
    }, { status: 200 });

  } catch (error) {
    const errorMessage = (error as Error).message || 'An unknown overall error occurred during processing the upload.';
    console.error('[Overall Request Error]', errorMessage, error);

    return NextResponse.json(
      { success: false, error: errorMessage, totalProcessed: 0, candidates: [] },
      { status: 500 }
    );
  }
}

// --- Next.js API Route Configuration ---
export const config = {
  api: {
    bodyParser: false,
  },
};