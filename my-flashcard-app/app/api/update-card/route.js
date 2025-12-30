import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateSm2 } from '../../utils/sm2'; // ดึงสูตรคำนวณมาใช้

// เชื่อม Supabase (แบบ Server Side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, quality, currentInterval, currentRepetition, currentEaseFactor } = body;

    // 1. คำนวณค่าใหม่ด้วยสูตร SM-2
    // quality: 0-5 (แต่เราจะใช้แค่ 3=จำไม่ได้, 5=จำได้แม่น เพื่อความง่าย)
    const { interval, repetition, easeFactor } = calculateSm2(
      quality, 
      currentRepetition, 
      currentEaseFactor, 
      currentInterval
    );

    // 2. คำนวณวันทบทวนถัดไป
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    // 3. อัปเดตลง Database
    const { error } = await supabase
      .from('flashcards')
      .update({
        interval: interval,
        repetition: repetition,
        ease_factor: easeFactor,
        next_review: nextReviewDate,
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, nextReview: nextReviewDate });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}