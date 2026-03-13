import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function reviewCode(diffChunk) {

  const prompt = `
You are a senior software engineer.

Review this pull request diff and identify:
- Bugs
- Security issues
- Bad practices

Return a JSON array with suggestions.

Diff:
${diffChunk}
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are a senior code reviewer."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return response.choices[0].message.content;
}