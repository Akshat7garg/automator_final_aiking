import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Star, Download, Video } from "lucide-react";
// import type { SessionType } from "@/pages/Interview";
import { useToast } from "@/components/ui/use-toast";

interface SessionType {
  feedback: {
    strengths: string[];
    improvements: string[];
    overallScore: number;
    transcript?: {
      question: string;
      answer: string;
    }[];
    recording?: string[];
  };
  transcripts?: {
    question: string;
    answer: string;
  }[];
  recordings?: string[];
  role?: string;
}

interface InterviewFeedbackProps {
  session: SessionType | null;
}

export const InterviewFeedback: React.FC<InterviewFeedbackProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<string>("summary");
  const { toast } = useToast();

  if (!session || !session.feedback) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">
          No feedback available. Please complete an interview session first.
        </p>
      </div>
    );
  }

  const feedback = {
    strengths: session.feedback.strengths || [],
    improvements: session.feedback.improvements || [],
    overallScore: session.feedback.overallScore || 0,
    transcript: session.feedback.transcript || session.transcripts || [],
    recording: session.recordings?.[0] || session.feedback.recording?.[0], // Use recordings first, fallback to feedback.recording
  };

  const { strengths, improvements, overallScore, transcript, recording } = feedback;

  const downloadTranscript = () => {
    if (!transcript) return;

    const transcriptText = transcript
      .map(
        (item, index) =>
          `Q${index + 1}: ${item.question}\n\nA: ${item.answer}\n\n`
      )
      .join("---\n\n");

    const feedbackText = `
INTERVIEW FEEDBACK
=================

Overall Score: ${overallScore}/10

Strengths:
${strengths.map((s) => `- ${s}`).join("\n")}

Areas for Improvement:
${improvements.map((i) => `- ${i}`).join("\n")}
`;

    const recordingsText = recording
      ? `
Recording:
- Interview Video: ${recording}
`
      : "";

    const fullText = `INTERVIEW TRANSCRIPT\n===================\n\n${transcriptText}\n\n${feedbackText}${recordingsText}`;

    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-feedback-${new Date().toISOString().split("T")[0]
      }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadVideo = async () => {
    if (!recording) return;

    try {
      toast({
        title: "Starting Download",
        description: "Preparing your video file...",
      });

      // Use our own API proxy to fetch the file, bypassing CORS issues
      const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(recording)}`;

      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-recording-${new Date().toISOString().split("T")[0]}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast({
        title: "Download Complete",
        description: "Your recording has been downloaded.",
      });
    } catch (err) {
      console.warn("Proxy download failed, trying direct link fallback:", err);

      // Fallback: Open in new tab
      const a = document.createElement("a");
      a.href = recording;
      a.target = "_blank";
      a.download = `interview-recording-${new Date().toISOString().split("T")[0]}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: "Download Fallback",
        description: "Direct download failed. Opened video in a new tab - you can save it from there.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative">
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#7000FF] blur-[180px] opacity-25 rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#FF00C7] blur-[180px] opacity-25 rounded-full pointer-events-none"></div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold font-raleway text-[#ECF1F0]">Interview Feedback</h2>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex items-center bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[#ECF1F0] hover:bg-[rgba(255,255,255,0.05)] transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96]"
            onClick={downloadTranscript}
          >
            <Download className="h-4 w-4 mr-2" />
            Save Transcript
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-inter text-[#B6B6B6]">
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end space-x-2">
              <span className="text-4xl font-bold font-raleway text-[#ECF1F0]">{overallScore}</span>
              <span className="text-xl text-[#B6B6B6] font-inter">/10</span>
            </div>
            <Progress value={overallScore * 10} className="h-2 mt-2 bg-[rgba(255,255,255,0.05)]" />
          </CardContent>
        </Card>

        <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-inter text-[#B6B6B6]">
              Questions Answered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-raleway text-[#ECF1F0]">{transcript?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-inter text-[#B6B6B6]">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-raleway text-[#ECF1F0]">
              {session.role || "General Interview"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
          <TabsTrigger
            value="summary"
            className="data-[state=active]:bg-[rgba(15,174,150,0.1)] data-[state=active]:text-[#0FAE96] data-[state=active]:shadow-none text-[#B6B6B6] hover:text-[#ECF1F0] transition duration-200"
          >
            Feedback Summary
          </TabsTrigger>
          <TabsTrigger
            value="transcript"
            className="data-[state=active]:bg-[rgba(15,174,150,0.1)] data-[state=active]:text-[#0FAE96] data-[state=active]:shadow-none text-[#B6B6B6] hover:text-[#ECF1F0] transition duration-200"
          >
            Transcript
          </TabsTrigger>
          <TabsTrigger
            value="recording"
            className="data-[state=active]:bg-[rgba(15,174,150,0.1)] data-[state=active]:text-[#0FAE96] data-[state=active]:shadow-none text-[#B6B6B6] hover:text-[#ECF1F0] transition duration-200"
          >
            Recording
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[rgba(15,174,150,0.05)] border border-[rgba(15,174,150,0.1)] rounded-lg overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center text-[#0FAE96] font-raleway">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-[#0FAE96]" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-[#0FAE96] shrink-0 mt-0.5" />
                      <span className="text-[#ECF1F0] font-inter">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[rgba(255,0,199,0.05)] border border-[rgba(255,0,199,0.1)] rounded-lg overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center text-[#FF00C7] font-raleway">
                  <Star className="h-5 w-5 mr-2 text-[#FF00C7]" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start">
                      <Star className="h-5 w-5 mr-2 text-[#FF00C7] shrink-0 mt-0.5" />
                      <span className="text-[#ECF1F0] font-inter">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="pt-6">
          <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden">
            <CardContent className="p-6">
              {transcript && transcript.length > 0 ? (
                <div className="space-y-6">
                  {transcript.map((item, index) => (
                    <div
                      key={index}
                      className="pb-6 border-b border-[rgba(255,255,255,0.05)] last:border-0"
                    >
                      <div className="mb-3">
                        <h3 className="text-sm font-medium font-inter text-[#B6B6B6]">
                          Question {index + 1}
                        </h3>
                        <p className="text-lg font-medium font-raleway text-[#ECF1F0] mt-1">
                          {item.question}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium font-inter text-[#B6B6B6]">
                          Your Answer to Question {index + 1}
                        </h3>
                        <p className="mt-1 text-[#B6B6B6] font-inter">
                          {item.answer || "No response provided"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#B6B6B6] font-inter">
                  No transcript available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording" className="pt-6">
          <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden">
            <CardContent className="p-6">
              {recording ? (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium font-inter text-[#B6B6B6]">
                      Interview Video
                    </h3>
                    <Button
                      variant="outline"
                      className="flex items-center bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[#ECF1F0] hover:bg-[rgba(255,255,255,0.05)] transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0FAE96]"
                      onClick={downloadVideo}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Video
                    </Button>
                  </div>
                  <div className="relative aspect-video bg-[#11011E] rounded-lg overflow-hidden shadow-xl">
                    <video
                      src={recording}
                      controls
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error("Video playback error:", e);
                        toast({
                          title: "Video Playback Error",
                          description: "Failed to play the recorded video. Try downloading it.",
                          variant: "destructive",
                        });
                      }}
                    />
                    <div className="absolute inset-0 pointer-events-none border-2 border-[#0FAE96]/20 rounded-lg" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 text-[rgba(255,255,255,0.1)] mx-auto mb-4" />
                  <p className="text-[#B6B6B6] font-inter">No recording available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterviewFeedback;