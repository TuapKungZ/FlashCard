// app/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

// ดึงค่า Key ที่เราเพิ่งใส่ใน .env.local มาใช้
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// สร้างตัวเชื่อมต่อ
export const supabase = createClient(supabaseUrl, supabaseKey);