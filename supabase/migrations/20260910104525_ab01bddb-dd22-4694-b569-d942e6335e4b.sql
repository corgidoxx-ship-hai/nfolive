-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.game_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.vote_channel AS ENUM ('live', 'clip', 'both');
CREATE TYPE public.donation_status AS ENUM ('pending', 'approved', 'rejected');

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

CREATE POLICY "users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ========== GAMES ==========
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_image_url text,
  status public.game_status NOT NULL DEFAULT 'pending',
  deadline date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX games_status_idx ON public.games (status);

GRANT SELECT ON public.games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads approved games"
  ON public.games FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "users read own submissions"
  ON public.games FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "admins read all games"
  ON public.games FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "users suggest games"
  ON public.games FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'pending');

CREATE POLICY "admins update games"
  ON public.games FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admins delete games"
  ON public.games FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins insert games"
  ON public.games FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ========== VOTES ==========
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel public.vote_channel NOT NULL,
  vote_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Bangkok')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id, vote_date)
);

CREATE INDEX votes_game_idx ON public.votes (game_id);

GRANT SELECT, INSERT ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own votes"
  ON public.votes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admins read all votes"
  ON public.votes FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "users cast own votes"
  ON public.votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND vote_date = (now() AT TIME ZONE 'Asia/Bangkok')::date
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id
        AND g.status = 'approved'
        AND (g.deadline IS NULL OR g.deadline >= (now() AT TIME ZONE 'Asia/Bangkok')::date)
    )
  );

-- Aggregated, anonymous vote counts readable by everyone.
CREATE VIEW public.game_vote_counts
WITH (security_invoker = off) AS
  SELECT
    g.id AS game_id,
    COUNT(v.id) AS total_votes,
    COUNT(v.id) FILTER (WHERE v.channel = 'live') AS live_votes,
    COUNT(v.id) FILTER (WHERE v.channel = 'clip') AS clip_votes,
    COUNT(v.id) FILTER (WHERE v.channel = 'both') AS both_votes
  FROM public.games g
  LEFT JOIN public.votes v ON v.game_id = g.id
  WHERE g.status = 'approved'
  GROUP BY g.id;

GRANT SELECT ON public.game_vote_counts TO anon, authenticated;

-- ========== DONATION SETTINGS (singleton) ==========
CREATE TABLE public.donation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  channel_name text NOT NULL DEFAULT 'ช่องของเรา',
  qr_image_url text,
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  is_live boolean NOT NULL DEFAULT false,
  overlay_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  alert_sound_key text NOT NULL DEFAULT 'arcade-coin',
  alert_sound_url text,
  alert_volume numeric NOT NULL DEFAULT 0.8,
  tts_enabled boolean NOT NULL DEFAULT true,
  tts_voice text NOT NULL DEFAULT 'alloy',
  tts_speed numeric NOT NULL DEFAULT 1.0,
  tts_template text NOT NULL DEFAULT '{name} โดเนท {amount} บาท บอกว่า {message}',
  alert_duration_sec integer NOT NULL DEFAULT 8,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT donation_settings_singleton_chk CHECK (singleton)
);

GRANT SELECT, UPDATE ON public.donation_settings TO authenticated;
GRANT ALL ON public.donation_settings TO service_role;
ALTER TABLE public.donation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read settings"
  ON public.donation_settings FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins update settings"
  ON public.donation_settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Public-safe subset (no overlay token)
CREATE VIEW public.public_donation_info
WITH (security_invoker = off) AS
  SELECT
    channel_name,
    qr_image_url,
    bank_name,
    account_number,
    account_name,
    is_live
  FROM public.donation_settings
  WHERE singleton;

GRANT SELECT ON public.public_donation_info TO anon, authenticated;

-- ========== DONATIONS ==========
CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  message text NOT NULL DEFAULT '',
  slip_path text,
  status public.donation_status NOT NULL DEFAULT 'pending',
  tts_audio_url text,
  shown_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX donations_status_idx ON public.donations (status, created_at DESC);

GRANT INSERT ON public.donations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone submits a donation note"
  ON public.donations FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND tts_audio_url IS NULL AND shown_at IS NULL AND approved_at IS NULL);

CREATE POLICY "admins read donations"
  ON public.donations FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins update donations"
  ON public.donations FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admins delete donations"
  ON public.donations FOR DELETE TO authenticated
  USING (public.is_admin());

-- ========== updated_at helper ==========
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER games_touch_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER donation_settings_touch_updated_at
  BEFORE UPDATE ON public.donation_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ========== SEED ==========
INSERT INTO public.donation_settings (singleton, channel_name, bank_name, account_number, account_name)
VALUES (true, 'ช่องของพี่ปี๊', 'ธนาคารกสิกรไทย', '123-4-56789-0', 'ตัวอย่าง ชื่อบัญชี');

INSERT INTO public.games (title, description, status) VALUES
  ('Elden Ring: Nightreign', 'เกมโหดสายบอสรัช ลุยกันสามคน ตายกี่รอบก็ยังสนุก', 'approved'),
  ('Silent Hill f', 'สยองขวัญญี่ปุ่นยุค 60 บรรยากาศหลอนจัดเต็ม เหมาะกับไลฟ์ดึกๆ', 'approved'),
  ('Palworld', 'จับมอนมาทำงานในโรงงาน สายฮาเน้นเล่นยาว', 'approved'),
  ('Resident Evil Requiem', 'ภาคใหม่ล่าสุดของซีรีส์ผีชีวะ ระทึกทุกโค้ง', 'approved'),
  ('Peak', 'เกมปีนเขาโคออปสุดป่วน เล่นกับเพื่อนแล้วทะเลาะกันแน่นอน', 'approved'),
  ('Hollow Knight: Silksong', 'เมโทรดวาเนียสุดยาก งานภาพสวย เพลงเพราะ', 'approved');