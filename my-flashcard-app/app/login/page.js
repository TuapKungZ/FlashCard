'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../utils/supabase'; // ถอยกลับไปหาไฟล์ supabase ของเรา
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);

  // เช็คว่าถ้า Login แล้ว ให้ดีดไปหน้าแรกทันที
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        router.replace('/'); // ถ้ามี session แล้ว ให้ไปหน้าแรก
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        router.replace('/'); // ถ้า Login สำเร็จ ให้ไปหน้าแรก
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // ถ้ายังไม่ Login ให้โชว์ฟอร์ม
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <h1 className="text-2xl font-bold text-center mb-6 text-slate-800">🔐 เข้าสู่ระบบ</h1>
          
          {/* นี่คือพระเอกของเรา: Auth UI สำเร็จรูป */}
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="default"
            providers={[]} // เราปิด login ด้วย Google/FB ไปก่อน เอาแค่ Email
            localization={{
                variables: {
                    sign_in: {
                        email_label: 'อีเมล',
                        password_label: 'รหัสผ่าน',
                        button_label: 'เข้าสู่ระบบ',
                    },
                    sign_up: {
                        email_label: 'อีเมล',
                        password_label: 'รหัสผ่าน',
                        button_label: 'สมัครสมาชิก',
                    }
                }
            }}
          />
        </div>
      </div>
    );
  } else {
    return <p className="text-center mt-20">กำลังเข้าสู่ระบบ...</p>;
  }
}