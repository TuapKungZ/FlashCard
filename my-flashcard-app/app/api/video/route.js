import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { url } = await req.json();

    // 1. 🔍 แกะ Video ID
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/)([\w-]{11}))/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) return NextResponse.json({ error: "Invalid Video ID" }, { status: 400 });

    console.log(`🎥 Processing Video ID: ${videoId}`);

    let transcriptItems = null;

    // 2. 📋 ดึงซับไตเติ้ลแบบ "สู้ไม่ถอย" (Fallback Strategy)
    // เราจะไม่ใช้ fetchTranscriptList แล้ว เพราะบางเครื่องรันไม่ได้
    try {
        // ไม้ที่ 1: ลองภาษาไทย ('th') ก่อนเลย
        console.log("👉 Attempt 1: Trying Thai (th)...");
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'th' });
    } catch (e1) {
        try {
            // ไม้ที่ 2: ถ้าไม่มีไทย ให้ลองภาษาอังกฤษ ('en')
            console.log("👉 Attempt 2: Trying English (en)...");
            transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        } catch (e2) {
            try {
                // ไม้ที่ 3 (ไม้ตาย): ไม่ระบุภาษา (เอาซับ Default ของคลิปมาเลย)
                // วิธีนี้จะแก้ปัญหาเรื่องรหัสภาษา (en-US, en-GB) ได้ชะงัด
                console.log("👉 Attempt 3: Trying Default Language (Auto)...");
                transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
            } catch (e3) {
                console.error("❌ All attempts failed.");
                throw new Error("หาซับไตเติ้ลไม่เจอเลย (คลิปนี้อาจไม่มีซับ หรือเป็นคลิปส่วนตัว)");
            }
        }
    }

    if (!transcriptItems || transcriptItems.length === 0) {
        throw new Error("ข้อมูลซับไตเติ้ลว่างเปล่า");
    }

    console.log(`✅ Transcript found! Length: ${transcriptItems.length} lines`);

    // 3. 🤖 ส่งให้ AI สรุป
    const fullText = transcriptItems.map(item => item.text).join(' ');
    // ตัดข้อความถ้ามันยาวเกินไป (ป้องกัน Token เต็ม)
    const truncatedText = fullText.substring(0, 25000); 

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are a strict JSON Flashcard Generator.
      Summarize the following video transcript into 5-8 flashcards.
      
      Rules:
      1. If the transcript is in Thai, create flashcards in THAI.
      2. If the transcript is in English, create flashcards in ENGLISH.
      3. Output must be a valid JSON Array ONLY. No markdown.
      
      Transcript: "${truncatedText}"

      Output Format:
      [ { "front": "Question", "back": "Answer" } ]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // ล้าง format เผื่อ AI เผลอส่ง Markdown มา
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    
    let flashcards;
    try {
        flashcards = JSON.parse(cleanJson);
    } catch (jsonError) {
        throw new Error("AI ตอบกลับมาผิดรูปแบบ (JSON Parse Error)");
    }

    return NextResponse.json({ flashcards });

  } catch (error) {
    console.error('🔥 Final Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}