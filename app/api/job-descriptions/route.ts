import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            jobTitle,
            jobType,
            experienceLevel,
            apikey, // coming from frontend
        } = body;

        // ✅ Validate inputs early
        if (!jobTitle || !jobType || !experienceLevel) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!apikey || typeof apikey !== "string") {
            return NextResponse.json(
                { message: "Missing or invalid Gemini API key" },
                { status: 400 }
            );
        }

        // ✅ Initialize Gemini with frontend key
        const genAI = new GoogleGenerativeAI(apikey);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
        });

        // ✅ AI-ONLY prompt (pattern-based)
        const prompt = `
            Generate 20 unique job descriptions for the role "${jobTitle}".

            STRICT RULES:
            - Do NOT browse the internet
            - Generate realistic job descriptions based on common hiring patterns
            - Include ONLY the following sections for each job description:
            1. Job Title
            2. Responsibilities
            3. Required Skills
            4. Qualifications
            - Do NOT include any other sections such as company overview, benefits, salary, perks, or application process
            - Do NOT summarize or shorten content
            - Preserve formatting inside each field:
            bullet points, line breaks, capitalization
            - Ensure each job description is clearly different

            Filters:
            - Job type: ${jobType}
            - Experience level: ${experienceLevel}

            OUTPUT FORMAT (MANDATORY):
            Return a JSON array of EXACTLY 20 objects.

            Each object MUST follow this EXACT schema:

            {
                "jobTitle": string,
                "responsibilities": string,
                "requiredSkills": string,
                "qualifications": string
            }

            Rules for output:
            - Use ONLY the keys listed above
            - Each value must be a STRING (may contain line breaks and bullet points)
            - Do NOT wrap output in markdown
            - Do NOT add explanations
            - Do NOT add extra text
            - Output ONLY valid JSON
        `;

        // ✅ Gemini call (correct structure)
        const response = await model.generateContent([
            { text: prompt }
        ]);

        const text =
            response?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return NextResponse.json(
                { message: "Empty response from Gemini" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { response: text },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("JD Gemini Error:", {
            message: error?.message,
            stack: error?.stack,
        });

        return NextResponse.json(
            { message: "Error generating job descriptions" },
            { status: 500 }
        );
    }
}
