// utils/sm2.js

/**
 * คำนวณวันทบทวนถัดไป ตามหลักการ SuperMemo-2 (SM-2)
 * @param {number} quality - คะแนนความจำ (0-5) 
 * (ในแอปเรา: Again=1, Hard=3, Easy=5)
 * @param {object} previousStats - ค่าสถิติเดิม { repetition, interval, easeFactor }
 */
export const calculateSm2 = (quality, previousStats) => {
  let { repetition, interval, easeFactor } = previousStats;

  // กฎ: ถ้าเกรดมากกว่าหรือเท่ากับ 3 ถือว่าจำได้ (Correct Response)
  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1; // ครั้งแรกที่จำได้ ให้ทบทวนพรุ่งนี้
    } else if (repetition === 1) {
      interval = 6; // ครั้งที่สองที่จำได้ ให้เว้น 6 วัน
    } else {
      // ครั้งต่อๆ ไป ให้เอาช่วงเวลาเดิม x ความยากง่าย (Ease Factor)
      interval = Math.round(interval * easeFactor);
    }

    // เพิ่มจำนวนครั้งที่จำได้ต่อเนื่อง
    repetition += 1;
  } else {
    // ถ้าจำไม่ได้ (Again/Wrong) ให้รีเซ็ตกลับไปเริ่มใหม่
    repetition = 0;
    interval = 1;
  }

  // สูตรคำนวณ Ease Factor ใหม่ (ความยากง่ายของการ์ดใบนี้)
  // สูตร: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // กฎ: Ease Factor ห้ามต่ำกว่า 1.3 (เดี๋ยวจะถี่เกินไปจนเป็นบั๊ก)
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { repetition, interval, easeFactor };
};