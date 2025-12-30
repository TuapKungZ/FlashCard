import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { text, amount = 10, topic = 'General' } = await req.json();

    // ใช้ gemini-1.5-flash-latest เพื่อความชัวร์ (หรือลอง gemini-pro ถ้ายังมีปัญหา)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prompt แบบบังคับจำนวนเคร่งครัด (Strict Mode)
    const prompt = `
      You are a strict Flashcard Generator.
      Task: Create EXACTLY ${amount} flashcards based on the text below.
      Topic: "${topic}"

      Rules:
      1. Quantity: You MUST return exactly ${amount} items. If the text is short, extract more details or generate related concepts to match the count.
      2. Content: "Front" is the question/term, "Back" is the answer/definition. Keep it concise.
      3. Language: Use the same language as the input text.
      4. Format: Return ONLY a raw JSON Array. Do not use Markdown (no \`\`\`json).

      Input Text:
      "${text.substring(0, 15000)}"

      Output Example:
      [{"front": "Question 1", "back": "Answer 1"}, {"front": "Question 2", "back": "Answer 2"}]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // ล้าง Format ขยะออกให้เกลี้ยง
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    
    const flashcards = JSON.parse(cleanJson);

    return NextResponse.json({ flashcards });

  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}