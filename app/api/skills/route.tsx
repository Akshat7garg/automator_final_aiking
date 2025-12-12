import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY as string);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const jobDescription = formData.get("jobDescription") as string;
    const uploadedFile = formData.get("file") as File;

    if (!uploadedFile || !jobDescription) {
      return NextResponse.json({ message: "Missing file or job description" }, { status: 400 });
    }

    // Convert PDF to Base64
    const arrayBuffer = await uploadedFile.arrayBuffer();
    const pdfContentBase64 = Buffer.from(arrayBuffer).toString("base64");

    // Prepare data for Gemini

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `
      You are an AI assistant specializing in job applications.
      Based on the provided resume (PDF) and job description (text), list the top 5 necessary skills that the candidate should include in their resume to improve their chances of getting shortlisted.
      Provide the skills in a comma-separated format.
    `;

    const response = await model.generateContent([
      { text: jobDescription }, 
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfContentBase64,
        },
      },
      { text: prompt }
    ]);
    const result = response.response.text(); // Extract text from Gemini response
    return NextResponse.json({ skills: result }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ message: "Error", error }, { status: 500 });
  }
}
