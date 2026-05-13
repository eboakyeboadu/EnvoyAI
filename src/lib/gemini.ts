
async function callGemini(payload: any) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Gemini call failed');
  }
  return response.json();
}

export const analyzeJobFit = async (resume: string, jobDescription: string) => {
  const prompt = `
    Analyze the following job description against the provided resume.
    Provide:
    1. A fit score from 0 to 100.
    2. A detailed analysis of why it is or isn't a good fit.
    3. Missing skills or keywords.
    4. Probability of success in getting an interview.

    Resume:
    ${resume}

    Job Description:
    ${jobDescription}
  `;

  const result = await callGemini({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            fitScore: { type: "NUMBER" },
            analysis: { type: "STRING" },
            missingSkills: { type: "ARRAY", items: { type: "STRING" } },
            probability: { type: "STRING" }
          },
          required: ["fitScore", "analysis", "probability"]
        }
      }
    }
  });

  return JSON.parse(result.text);
};

export const customizeDocuments = async (resume: string, jobDescription: string) => {
  const prompt = `
    Create a customized resume and cover letter for the following job description based on the user's resume.
    Focus on highlighting relevant skills and keywords from the job posting.

    Original Resume:
    ${resume}

    Job Description:
    ${jobDescription}
  `;

  const result = await callGemini({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            customResume: { type: "STRING" },
            customCoverLetter: { type: "STRING" }
          },
          required: ["customResume", "customCoverLetter"]
        }
      }
    }
  });

  return JSON.parse(result.text);
};

export const parseJobListings = async (searchResultText: string, preferences: string) => {
  const prompt = `
    Extract structured job listings from the following text based on these preferences: ${preferences}.
    Only extract real job opportunities that mention a title, company, and link.

    Text:
    ${searchResultText}
  `;

  const result = await callGemini({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              company: { type: "STRING" },
              location: { type: "STRING" },
              link: { type: "STRING" },
              description: { type: "STRING" },
              salary: { type: "STRING" },
              source: { type: "STRING" }
            },
            required: ["title", "company", "link"]
          }
        }
      }
    }
  });

  return JSON.parse(result.text);
};
