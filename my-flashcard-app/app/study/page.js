'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

export default function StudyPage() {
  const router = useRouter();
  
  // Data
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [cards, setCards] = useState([]); // Cards สำหรับโหมด Flashcard
  const [initialCount, setInitialCount] = useState(0);

  // Mode: 'study' (ปกติ) | 'study-mix' (สลับหน้าหลัง) | 'quiz' (ทดสอบ)
  const [mode, setMode] = useState('study'); 

  // --- Flashcard State ---
  const [isFlipped, setIsFlipped] = useState(false);
  
  // --- Quiz State ---
  const [quizData, setQuizData] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);

  // Init
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      fetchTopics(user.id);
    };
    init();
  }, [router]);

  const fetchTopics = async (userId) => {
    const { data } = await supabase.from('flashcards').select('topic').eq('user_id', userId);
    if (data) setTopics([...new Set(data.map(d => d.topic))]);
  };

  const startStudy = async (topic, selectedMode = 'study') => {
    setSelectedTopic(topic);
    setCards([]);
    setInitialCount(0);
    setMode(selectedMode);
    
    // โหลดข้อมูล
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('topic', topic)
      .order('next_review', { ascending: true });
    
    if (data && data.length > 0) {
        // ถ้าเป็นโหมด Mix ให้สุ่มสลับหน้าหลังเตรียมไว้เลย
        let preparedCards = data;
        if (selectedMode === 'study-mix') {
             preparedCards = data.map(c => ({
                 ...c,
                 isReversed: Math.random() > 0.5 // สุ่มว่าใบนี้จะกลับด้านหรือไม่
             }));
        }

        setCards(preparedCards);
        setInitialCount(data.length);
        
        // เตรียม Quiz ไว้ด้วย (เผื่อกดเปลี่ยนโหมด)
        generateQuiz(data); 
    } else {
        alert("ไม่พบข้อมูลการ์ด");
        setSelectedTopic(null);
    }
    setIsFlipped(false);
  };

  // --- Quiz Logic Generator ---
  const generateQuiz = (sourceCards) => {
    const shuffled = [...sourceCards].sort(() => 0.5 - Math.random());
    
    const questions = shuffled.map(card => {
        // Mixed Mode ใน Quiz: สุ่มว่าจะถามหน้าหรือหลัง
        const isReverse = Math.random() > 0.5;
        
        const questionText = isReverse ? card.back : card.front;
        const correctText = isReverse ? card.front : card.back;

        const otherCards = sourceCards.filter(c => c.id !== card.id);
        const distractors = otherCards
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(c => isReverse ? c.front : c.back);

        const options = [...distractors, correctText].sort(() => 0.5 - Math.random());

        return {
            id: card.id,
            originalCard: card, // เก็บ object เดิมไว้เผื่อวนซ้ำ
            question: questionText,
            correctAnswer: correctText,
            options: options,
            type: isReverse ? 'Back -> Front' : 'Front -> Back'
        };
    });

    setQuizData(questions);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
  };

  const handleQuizAnswer = (option) => {
      if (selectedAnswer) return; // ป้องกันกดรัว

      const currentQ = quizData[currentQuizIndex];
      const correct = option === currentQ.correctAnswer;
      
      setSelectedAnswer(option);
      setIsAnswerCorrect(correct);

      if (correct) {
          // ถ้าถูก: ได้คะแนน
          setQuizScore(prev => prev + 1);
      } else {
          // ✅ ถ้าผิด: วนกลับไปทำใหม่ (Re-queue)
          // เพิ่มคำถามเดิมไปต่อท้ายแถว (หรือสุ่มแทรกในอนาคต)
          setQuizData(prev => {
              const newData = [...prev];
              // สร้างคำถามใหม่จาก Card เดิม (อาจจะสลับช้อยส์ใหม่ หรือสลับหน้าหลังใหม่ก็ได้ถ้าต้องการ แต่เอาแบบเดิมง่ายสุด)
              // แต่เพื่อให้ไม่งง เอาข้อเดิมนี่แหละไปต่อท้าย
              newData.push({
                  ...currentQ,
                  id: currentQ.id + `_retry_${Date.now()}` // เปลี่ยน ID เพื่อให้ React render ใหม่
              });
              return newData;
          });
      }

      // Auto Next
      setTimeout(() => {
          if (currentQuizIndex < quizData.length - 1) {
              setCurrentQuizIndex(prev => prev + 1);
              setSelectedAnswer(null);
              setIsAnswerCorrect(null);
          } else {
              setQuizFinished(true);
          }
      }, 1000); // ลดเวลาหน่วงลงเหลือ 1 วินาที
  };

  // --- Flashcard Logic (Swipe) ---
  const handleSwipe = async (direction) => {
    const current = cards[0];
    
    if (direction === 'right') {
        // จำได้ -> อัปเดต DB
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 3);
        supabase.from('flashcards').update({ next_review: nextDate.toISOString() }).eq('id', current.id).then();
        
        setCards(prev => prev.slice(1));
    } else {
        // จำไม่ได้ -> วนกลับ
        setCards(prev => [...prev.slice(1), current]);
    }
    
    setIsFlipped(false);
  };

  // --- UI Helpers ---
  const changeMode = (newMode) => {
      if (newMode === 'quiz') {
          setMode('quiz');
          // Reset Quiz state
          generateQuiz(cards.length > 0 ? cards : quizData.map(q => q.originalCard || q)); 
      } else {
          // ถ้าเปลี่ยนเป็น Flashcard mode (study หรือ study-mix) ให้เริ่มใหม่
          startStudy(selectedTopic, newMode);
      }
  };

  // --- UI Components ---

  // 1. Topic Selection
  if (!selectedTopic) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-4xl">
                <h1 className="text-4xl font-extrabold text-slate-800 mb-2 text-center">🧠 ฝึกสมองประลองปัญญา</h1>
                <p className="text-slate-500 mb-10 text-center">เลือกหมวดหมู่ที่ต้องการทบทวนวันนี้</p>
                
                {topics.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {topics.map(t => (
                            <motion.button 
                                key={t} 
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => startStudy(t, 'study')} 
                                className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200 border border-white hover:shadow-xl transition-all text-left relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-colors group-hover:bg-indigo-100"></div>
                                <h2 className="text-2xl font-bold text-slate-700 relative z-10">{t}</h2>
                                <span className="inline-block mt-4 text-sm font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full relative z-10 group-hover:bg-white">
                                    เริ่มเลย →
                                </span>
                            </motion.button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-slate-400 text-lg">ยังไม่มีการ์ดเลย</p>
                        <Link href="/" className="text-indigo-600 font-bold hover:underline mt-2 inline-block">สร้างการ์ดใบแรก</Link>
                    </div>
                )}
                
                <div className="mt-12 text-center">
                     <Link href="/" className="px-6 py-3 rounded-full bg-white text-slate-500 font-bold shadow-sm hover:bg-slate-50 transition">
                        ← กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        </div>
    );
  }

  // 2. Loading / Finished Screen
  const isFlashcardFinished = (mode.startsWith('study')) && cards.length === 0;
  
  if (isFlashcardFinished || quizFinished) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-12 rounded-3xl shadow-xl max-w-sm w-full"
            >
                {initialCount > 0 || quizData.length > 0 ? (
                    <>
                        <div className="text-8xl mb-6">🎉</div>
                        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">สุดยอดมาก!</h2>
                        
                        {mode === 'quiz' ? (
                            <div className="mb-8">
                                <p className="text-slate-500">คุณตอบถูกทั้งหมด</p>
                                <p className="text-4xl font-bold text-indigo-600 mt-2">{quizScore} ครั้ง</p>
                                <p className="text-xs text-slate-400 mt-2">(รวมข้อที่แก้ตัวใหม่)</p>
                            </div>
                        ) : (
                            <p className="text-slate-500 mb-8">คุณทบทวนการ์ดชุดนี้ครบแล้ว</p>
                        )}

                        <div className="space-y-3">
                            <button onClick={() => changeMode(mode)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
                                เล่นอีกครั้ง
                            </button>
                            <button onClick={() => setSelectedTopic(null)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">
                                เลือกหัวข้ออื่น
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center">
                         <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                         <p className="text-slate-400 font-bold">กำลังเตรียมข้อมูล...</p>
                    </div>
                )}
            </motion.div>
        </div>
      );
  }

  // --- Main Render ---
  
  let progress = 0;
  if (mode.startsWith('study')) {
     progress = initialCount > 0 ? ((initialCount - cards.length) / initialCount) * 100 : 0;
  } else {
     progress = ((currentQuizIndex) / quizData.length) * 100;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center pt-8 px-4 overflow-hidden select-none">
        
        {/* Header */}
        <div className="w-full max-w-md flex items-center justify-between mb-4 z-10">
             <button onClick={() => setSelectedTopic(null)} className="w-10 h-10 rounded-full bg-white text-slate-400 shadow hover:text-red-500 flex items-center justify-center transition">✕</button>
             <div className="flex flex-col items-center">
                <span className="font-bold text-slate-700 text-lg">{selectedTopic}</span>
                <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">
                    {mode.startsWith('study') ? `เหลือ ${cards.length} ใบ` : `ข้อ ${currentQuizIndex + 1}/${quizData.length}`}
                </span>
             </div>
             <div className="w-10"></div>
        </div>

        {/* Mode Switcher */}
        <div className="bg-white p-1 rounded-full shadow-sm mb-6 flex space-x-1">
            <button 
                onClick={() => changeMode('study')}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${mode === 'study' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                Cards
            </button>
            <button 
                onClick={() => changeMode('study-mix')}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${mode === 'study-mix' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                Mix 🔀
            </button>
            <button 
                onClick={() => changeMode('quiz')}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${mode === 'quiz' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                Quiz
            </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
            <motion.div 
                className={`h-full ${mode === 'quiz' ? 'bg-purple-500' : (mode === 'study-mix' ? 'bg-pink-500' : 'bg-indigo-500')}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
            />
        </div>

        {/* ================= MODE: FLASHCARD (Standard & Mix) ================= */}
        {mode.startsWith('study') && cards.length > 0 && (
            <>
                <div className="relative w-full max-w-sm h-[400px] flex items-center justify-center perspective-1000">
                    <AnimatePresence>
                        {/* Background Card */}
                        {cards[1] && (
                            <motion.div
                                key={cards[1].id}
                                className="absolute w-full h-full bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center"
                                initial={{ scale: 0.9, y: 20, opacity: 0.5 }}
                                animate={{ scale: 0.95, y: 10, opacity: 1 }}
                                style={{ zIndex: 0 }}
                            >
                                <div className="text-slate-200 font-bold text-4xl opacity-50">?</div>
                            </motion.div>
                        )}

                        {/* Active Card with 3D Flip */}
                        <SwipeableCard3D 
                            key={cards[0].id}
                            card={cards[0]}
                            isMixMode={mode === 'study-mix'}
                            isFlipped={isFlipped}
                            onFlip={() => setIsFlipped(!isFlipped)}
                            onSwipe={handleSwipe}
                        />
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 mt-8 z-10">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleSwipe('left')} className="w-16 h-16 rounded-full bg-white text-red-500 shadow-xl shadow-red-100 border border-red-50 flex items-center justify-center text-3xl hover:bg-red-50 transition">✕</motion.button>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">ปัดการ์ด หรือ กดปุ่ม</p>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleSwipe('right')} className="w-16 h-16 rounded-full bg-white text-green-500 shadow-xl shadow-green-100 border border-green-50 flex items-center justify-center text-3xl hover:bg-green-50 transition">✓</motion.button>
                </div>
            </>
        )}

        {/* ================= MODE: QUIZ ================= */}
        {mode === 'quiz' && quizData.length > 0 && (
            <div className="w-full max-w-md">
                <motion.div 
                    key={currentQuizIndex} // Key change triggers animation
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-3xl shadow-xl p-8 text-center mb-6 min-h-[200px] flex flex-col items-center justify-center relative overflow-hidden"
                >
                    {/* Badge ถ้าเป็นการ Re-try */}
                    {quizData[currentQuizIndex].id.toString().includes('retry') && (
                        <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-bl-xl">
                            แก้ตัวใหม่
                        </div>
                    )}
                    
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4">
                        {quizData[currentQuizIndex].type === 'Front -> Back' ? 'คำศัพท์นี้คือ?' : 'ความหมายนี้คือ?'}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-800">{quizData[currentQuizIndex].question}</h2>
                </motion.div>

                <div className="grid gap-3">
                    {quizData[currentQuizIndex].options.map((option, idx) => {
                        let btnClass = "w-full p-4 rounded-xl text-left border-2 transition-all duration-200 font-medium ";
                        
                        if (selectedAnswer) {
                            if (option === quizData[currentQuizIndex].correctAnswer) {
                                btnClass += "bg-green-100 border-green-500 text-green-700 shadow-md transform scale-102"; // เฉลยถูก
                            } else if (option === selectedAnswer) {
                                btnClass += "bg-red-100 border-red-500 text-red-700"; // ตอบผิด
                            } else {
                                btnClass += "bg-slate-50 border-slate-100 opacity-50"; // ข้ออื่นๆ
                            }
                        } else {
                            btnClass += "bg-white border-slate-100 text-slate-600 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 shadow-sm";
                        }

                        return (
                            <motion.button 
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => handleQuizAnswer(option)}
                                disabled={!!selectedAnswer}
                                className={btnClass}
                            >
                                {option}
                            </motion.button>
                        );
                    })}
                </div>
                {selectedAnswer && !isAnswerCorrect && (
                     <div className="mt-4 text-center text-red-500 font-bold text-sm animate-pulse">
                         ผิด! เดี๋ยวข้อนี้จะวนกลับมาถามใหม่นะ
                     </div>
                )}
            </div>
        )}
        
        {/* CSS for 3D */}
        <style jsx global>{`
            .perspective-1000 { perspective: 1000px; }
            .transform-style-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .rotate-y-180 { transform: rotateY(180deg); }
        `}</style>
    </div>
  );
}

// --- Component: 3D Swipeable Card ---
function SwipeableCard3D({ card, isFlipped, onFlip, onSwipe, isMixMode }) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
    const bgDrag = useTransform(x, [-200, -50, 0, 50, 200], ['#fee2e2', '#ffffff', '#ffffff', '#ffffff', '#dcfce7']);

    const handleDragEnd = (event, info) => {
        const offset = info.offset.x;
        if (offset > 100) onSwipe('right');
        else if (offset < -100) onSwipe('left');
    };

    // Logic Mix Mode: ถ้าใบนี้ถูกสุ่มให้ Reverse (isReversed=true) ให้สลับเนื้อหา Front/Back ที่จะแสดง
    const showReverse = isMixMode && card.isReversed;
    const displayFront = showReverse ? card.back : card.front;
    const displayBack = showReverse ? card.front : card.back;
    const labelFront = showReverse ? "Meaning" : "Term";
    const labelBack = showReverse ? "Term" : "Meaning";

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: "grabbing" }}
            onClick={onFlip}
            initial={{ scale: 0.5, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0, transition: { duration: 0.2 } }}
            className="absolute w-full h-full cursor-grab z-20 perspective-1000"
        >
            {/* ปรับ duration-500 เป็น duration-300 เพื่อให้พลิกเร็วขึ้น */}
            <motion.div 
                className="relative w-full h-full transform-style-3d transition-transform duration-50"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
            >
                {/* --- FRONT SIDE --- */}
                <motion.div 
                    style={{ backgroundColor: bgDrag }}
                    className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-2xl border-2 border-slate-100 flex flex-col items-center justify-center p-8 text-center"
                >
                    <motion.div style={{ opacity: useTransform(x, [50, 100], [0, 1]) }} className="absolute top-8 left-8 border-4 border-green-500 text-green-500 rounded-lg px-2 py-1 font-bold text-2xl -rotate-12">จำได้!</motion.div>
                    <motion.div style={{ opacity: useTransform(x, [-100, -50], [1, 0]) }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 rounded-lg px-2 py-1 font-bold text-2xl rotate-12">ลืม...</motion.div>

                    <span className="text-xs font-bold tracking-widest text-slate-300 uppercase mb-6">{labelFront}</span>
                    <h2 className="text-4xl font-bold text-slate-800 leading-tight">{displayFront}</h2>
                    <p className="absolute bottom-8 text-xs text-slate-300">แตะเพื่อดูเฉลย</p>
                </motion.div>

                {/* --- BACK SIDE --- */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 text-center text-white">
                    <span className="text-xs font-bold tracking-widest text-indigo-200 uppercase mb-6">{labelBack}</span>
                    <h2 className="text-3xl font-bold leading-relaxed">{displayBack}</h2>
                </div>
            </motion.div>
        </motion.div>
    );
}