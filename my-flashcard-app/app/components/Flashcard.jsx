'use client';
import React, { useState } from 'react';
import { calculateSm2 } from '../utils/sm2'; // <-- 1. import เข้ามา (เช็ค path ให้ถูกนะ)

// จำลองข้อมูลเริ่มต้นของการ์ด (ปกติค่าพวกนี้จะดึงมาจาก Database)
const initialStats = {
  repetition: 0,
  interval: 0,
  easeFactor: 2.5,
};

const Flashcard = ({ frontContent, backContent }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState(initialStats); // <-- เก็บสถิติของการ์ดใบนี้

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // 2. ฟังก์ชันหลักเมื่อกดปุ่ม
  const handleRate = (quality) => {
    // คำนวณค่าใหม่
    const newStats = calculateSm2(quality, stats);
    
    // อัปเดต State (ในของจริง ตรงนี้คือจังหวะที่ต้อง Save ลง Database)
    setStats(newStats); 
    setIsFlipped(false); // พลิกการ์ดกลับไปหน้าแรก

    // --- DEBUG: แสดงผลลัพธ์ให้ดู (ลบออกได้ตอนใช้งานจริง) ---
    alert(`
      คุณตอบ: ${quality === 5 ? 'Easy' : quality === 3 ? 'Hard' : 'Again'}
      -------------------------
      ผลลัพธ์จาก AI (SM-2):
      📅 เจอกันอีกทีใน: ${newStats.interval} วัน
      🧠 ความยาก (EF): ${newStats.easeFactor.toFixed(2)}
    `);
    // ----------------------------------------------------
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4">
      {/* ... (ส่วนแสดงผลการ์ด เหมือนเดิมเป๊ะ) ... */}
      <div 
        className="group h-64 w-full max-w-md cursor-pointer [perspective:1000px]"
        onClick={handleFlip}
      >
        <div
          className={`relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* Front Face */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-xl border-2 border-slate-100 [backface-visibility:hidden]">
            <span className="text-sm text-gray-400 mb-2 uppercase tracking-wider">Question</span>
            <h2 className="text-2xl font-bold text-slate-800">{frontContent}</h2>
            <p className="absolute bottom-4 text-xs text-gray-400 animate-pulse">Tap to flip</p>
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-indigo-50 p-8 text-center shadow-xl border-2 border-indigo-100 [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <span className="text-sm text-indigo-400 mb-2 uppercase tracking-wider">Answer</span>
            <p className="text-xl font-medium text-slate-700">{backContent}</p>
          </div>
        </div>
      </div>

      {/* 3. ผูกปุ่มกับฟังก์ชัน handleRate */}
      <div className={`flex gap-4 transition-opacity duration-300 ${isFlipped ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        
        {/* Again (ลืม) = Quality 1 */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleRate(1); }}
          className="px-6 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors">
          ลืม (Again)
        </button>

        {/* Hard (ยาก) = Quality 3 */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleRate(3); }}
          className="px-6 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-200 transition-colors">
          ยาก (Hard)
        </button>

        {/* Easy (ง่าย) = Quality 5 */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleRate(5); }}
          className="px-6 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition-colors">
          ง่าย (Easy)
        </button>

      </div>
      
      {/* แสดง Info เล็กๆ ให้เห็นค่าปัจจุบัน (Optional) */}
      <div className="text-xs text-gray-400 mt-4">
        Current Interval: {stats.interval} days | Reps: {stats.repetition}
      </div>

    </div>
  );
};

export default Flashcard;