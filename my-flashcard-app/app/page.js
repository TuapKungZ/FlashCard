'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './utils/supabase';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Tabs: 'ai' | 'manual'
  const [activeTab, setActiveTab] = useState('ai');
  
  // Inputs
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState(10);
  
  // Manual Inputs
  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
      else setUser(user);
    };
    getUser();
  }, [router]);

  // --- Logic เดิม (AI) ---
  const handleAIGenerate = async () => {
    if (!content || !topic) return alert('⚠️ กรุณาระบุหัวข้อและเนื้อหาก่อนครับ');
    setIsLoading(true);
    setGeneratedCards([]);
    setIsSaved(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, amount, topic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedCards(data.flashcards || []);
    } catch (e) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logic เดิม (Save) ---
  const saveCardsToDB = async (cardsToSave) => {
    if (!user || !topic) return alert('⚠️ ระบุหัวข้อวิชาก่อนบันทึก');
    
    const formattedCards = cardsToSave.map(c => ({
      front: c.front,
      back: c.back,
      topic: topic,
      user_id: user.id,
      next_review: new Date().toISOString()
    }));

    const { error } = await supabase.from('flashcards').insert(formattedCards);
    if (error) alert('บันทึกพลาด: ' + error.message);
    else {
      setIsSaved(true);
      setTimeout(() => {
          setGeneratedCards([]);
          setContent('');
          setManualFront('');
          setManualBack('');
          setIsSaved(false);
      }, 2000);
    }
  };

  // --- Logic เดิม (Manual) ---
  const handleManualAdd = () => {
    if (!manualFront || !manualBack) return alert('กรอกข้อมูลให้ครบนะ');
    saveCardsToDB([{ front: manualFront, back: manualBack }]);
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-indigo-50 text-indigo-400 font-bold animate-pulse">Loading Magic...</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 md:p-10 font-sans text-slate-800">
      
      {/* --- Header --- */}
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Flashcard AI ⚡
            </h1>
            <p className="text-slate-500 mt-1 font-medium">เปลี่ยนข้อความให้เป็นความรู้ ในเสี้ยววินาที</p>
        </div>
        
        <div className="flex items-center gap-3">
             <Link href="/study" className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-indigo-600 px-6 font-medium text-white transition-all duration-300 hover:bg-indigo-700 hover:w-48 hover:shadow-lg hover:shadow-indigo-200">
                <span className="mr-2 text-xl">🚀</span>
                <span className="whitespace-nowrap opacity-100 transition-all group-hover:opacity-100">ไปโหมดฝึกจำ</span>
            </Link>
            <button 
                onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} 
                className="h-12 w-12 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center"
                title="Logout"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
            </button>
        </div>
      </header>

      {/* --- Main Card --- */}
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8 relative overflow-hidden">
        
        {/* Topic Input (Always Visible) */}
        <div className="mb-8">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📂 1. ตั้งชื่อวิชา / หมวดหมู่</label>
            <input 
                type="text" 
                value={topic} 
                onChange={e => setTopic(e.target.value)}
                placeholder="เช่น ศัพท์ TOEIC, ประวัติศาสตร์ไทย, สูตรเคมี..."
                className="w-full text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-2 placeholder-slate-300 transition-colors"
            />
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl w-fit mb-6">
            <button 
                onClick={() => setActiveTab('ai')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                ✨ ให้ AI ช่วยสร้าง
            </button>
            <button 
                onClick={() => setActiveTab('manual')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'manual' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                ✍️ เพิ่มเองทีละใบ
            </button>
        </div>

        {/* --- AI MODE --- */}
        {activeTab === 'ai' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">📝 2. ใส่เนื้อหาที่ต้องการสรุป</label>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg">
                        <span className="text-xs font-bold text-indigo-400">จำนวน:</span>
                        <select 
                            value={amount} 
                            onChange={e => setAmount(Number(e.target.value))}
                            className="bg-transparent text-sm font-bold text-indigo-700 outline-none cursor-pointer"
                        >
                            <option value="5">5 ใบ</option>
                            <option value="10">10 ใบ</option>
                            <option value="15">15 ใบ</option>
                        </select>
                    </div>
                </div>
                
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows="6"
                    placeholder="วางบทความ, เนื้อหาหนังสือ, หรือสรุปย่อที่นี่... เดี๋ยว AI จะแปลงเป็น Flashcard ให้เองครับ"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-slate-700 transition-all resize-none mb-4"
                />

                <button 
                    onClick={handleAIGenerate} 
                    disabled={isLoading}
                    className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform active:scale-95 
                        ${isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-indigo-200 hover:-translate-y-1'}`}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            สมองกลกำลังทำงาน...
                        </span>
                    ) : '✨ เสก Flashcards'}
                </button>
            </div>
        )}

        {/* --- MANUAL MODE --- */}
        {activeTab === 'manual' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">ด้านหน้า (คำถาม)</label>
                        <input 
                            value={manualFront} 
                            onChange={e => setManualFront(e.target.value)}
                            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all"
                            placeholder="เช่น Ant"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2">ด้านหลัง (คำตอบ)</label>
                        <input 
                            value={manualBack} 
                            onChange={e => setManualBack(e.target.value)}
                            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all"
                            placeholder="เช่น มด"
                        />
                    </div>
                </div>
                <button 
                    onClick={handleManualAdd}
                    className="w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-orange-400 to-pink-500 shadow-lg hover:shadow-orange-200 hover:-translate-y-1 transition-all active:scale-95"
                >
                    + เพิ่มการ์ดใบนี้
                </button>
            </div>
        )}
      </div>

      {/* --- Preview Section (Show when cards are generated) --- */}
      {generatedCards.length > 0 && (
          <div className="max-w-4xl mx-auto mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                      🎉 ผลลัพธ์ ({generatedCards.length} ใบ)
                  </h3>
                  <button 
                      onClick={() => saveCardsToDB(generatedCards)}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-200 hover:bg-green-600 hover:-translate-y-0.5 transition-all"
                  >
                      💾 บันทึกทั้งหมดลงเครื่อง
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedCards.map((c, i) => (
                      <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col gap-2 relative group">
                          <span className="absolute top-2 right-2 text-xs text-slate-200 font-bold group-hover:text-indigo-200">#{i+1}</span>
                          <div>
                              <span className="text-xs font-bold text-indigo-400 uppercase">Q:</span>
                              <p className="font-semibold text-slate-800">{c.front}</p>
                          </div>
                          <div className="w-full h-[1px] bg-slate-100 my-1"></div>
                          <div>
                              <span className="text-xs font-bold text-emerald-400 uppercase">A:</span>
                              <p className="text-slate-600">{c.back}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- Success Notification --- */}
      {isSaved && (
          <div className="fixed bottom-10 right-10 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in duration-500">
              <span className="text-2xl">✅</span>
              <div>
                  <h4 className="font-bold">บันทึกสำเร็จ!</h4>
                  <p className="text-xs text-green-100">พร้อมเรียนรู้แล้วครับ</p>
              </div>
          </div>
      )}

    </main>
  );
}