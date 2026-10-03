# GameVote

เว็บแอปให้แฟนคลับโหวตเกมที่อยากให้เจ้าของช่องเล่น (ไลฟ์ / อัดคลิป / ทั้งสองแบบ) พร้อมโดเนทผ่าน QR PromptPay
และ overlay แจ้งเตือนโดเนทพร้อมเสียงอ่านภาษาไทยสำหรับ OBS / TikTok Live Studio

**Stack:** TanStack Start (React 19, SSR) · Vite 8 · Tailwind 4 · shadcn/ui · Supabase (Postgres, Auth, Storage) · OpenAI TTS

## เริ่มพัฒนา

```sh
npm install
cp .env.example .env     # แล้วกรอกค่าตามหัวข้อถัดไป
npm run dev              # http://localhost:3000
```

| คำสั่ง              | ทำอะไร                              |
| ------------------- | ----------------------------------- |
| `npm run dev`       | dev server                          |
| `npm run build`     | build production (ออกที่ `.output`) |
| `npm run typecheck` | ตรวจ TypeScript                     |
| `npm run lint`      | ESLint + Prettier                   |
| `npm run format`    | จัดรูปแบบโค้ด                       |

## ตั้งค่า Supabase (ครั้งแรก)

1. สร้างโปรเจกต์ที่ https://supabase.com แล้วเอาค่าจาก **Project Settings > API** ใส่ `.env`
   (`SUPABASE_SERVICE_ROLE_KEY` เป็นความลับ ห้ามใส่ใน git และห้ามขึ้นต้นด้วย `VITE_`)
2. สร้างตาราง, policy และ storage bucket จากไฟล์ใน `supabase/migrations/`:
   ```sh
   npx supabase login
   npx supabase init                       # สร้าง supabase/config.toml (migrations เดิมไม่หาย)
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   ```
3. **Authentication > URL Configuration:** ใส่ Site URL เป็นโดเมนจริง และเพิ่ม Redirect URL
   `http://localhost:3000` สำหรับ dev
4. **Authentication > Providers:**
   - **Google:** สร้าง OAuth Client ใน Google Cloud Console แล้วใส่ Client ID/Secret
   - **Azure (Microsoft / Hotmail):** ลงทะเบียนแอปใน Azure Portal แล้วใส่ Client ID/Secret/Tenant
   - ทั้งสองต้องตั้ง Redirect URI เป็น `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - อีเมล/รหัสผ่านใช้ได้เลย (ตัวส่งอีเมลยืนยันของ Supabase มีโควตาจำกัด ถ้าใช้จริงควรตั้ง SMTP ของตัวเอง)
5. ล็อกอินในเว็บ แล้วเข้า `/admin` เพื่อรับสิทธิ์แอดมิน (ทำได้เฉพาะคนแรก ตอนที่ยังไม่มีแอดมิน)
6. ในหน้าแอดมิน ใส่ QR และเลขบัญชีจริง

## เสียงอ่านโดเนท (TTS)

ใช้ OpenAI `gpt-4o-mini-tts` ต้องมี `OPENAI_API_KEY` ใน `.env` (คิดเงินตามการใช้งาน)
ถ้าไม่ใส่ ระบบยังทำงานปกติ แค่ไม่มีเสียงอ่าน (เสียงแจ้งเตือนสำเร็จรูปยังใช้ได้)

## Deploy

ตัว build ใช้ [Nitro](https://nitro.build) ซึ่งเลือกปลายทางให้อัตโนมัติเมื่อ build บน Vercel / Netlify / Cloudflare
หรือบังคับเองด้วย `NITRO_PRESET=<preset>` ก่อนสั่ง `npm run build` ตั้ง environment variables
ทั้งหมดใน `.env.example` ที่ผู้ให้บริการโฮสต์

รันเองบนเซิร์ฟเวอร์ Node (preset `node-server` ซึ่งเป็นค่าเริ่มต้นนอก 3 เจ้าด้านบน):

```sh
npm run build
node --env-file=.env .output/server/index.mjs
```

## โครงสร้าง

```
src/routes/            หน้าเว็บ (file-based routing) / = โหวต, /auth, /admin, /overlay/$token
src/lib/*.functions.ts server functions (รันฝั่งเซิร์ฟเวอร์)
src/integrations/supabase/  client, middleware ตรวจ token, types
src/components/        คอมโพเนนต์ของแอป, ui/ = shadcn
supabase/migrations/   schema + RLS + storage
docs/                  แผนงานเดิมและสรุปสถานะ
```

`src/routeTree.gen.ts` และ `src/integrations/supabase/types.ts` สร้างอัตโนมัติ (อันแรกโดย `npm run dev`,
อันหลังด้วย `npx supabase gen types typescript --project-id <REF> > src/integrations/supabase/types.ts`
เมื่อแก้ schema)

## งานค้าง

ดู `docs/plan.md` หัวข้อ "งานที่ยังค้าง" (ช่องโหว่การอัปโหลดสลิป และ security warning ที่เหลือ)
