-- ============================================================
-- PAYMENTS SYSTEM MIGRATION
-- Run this entire script in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Add project_value column to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_value numeric;

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  lead_id         uuid        NOT NULL,
  type            text        NOT NULL,        -- 'upfront' | 'final'
  amount          numeric     NOT NULL,
  status          text        NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid'
  due_date        date,
  paid_date       date,
  payment_method  text,                        -- 'upi' | 'bank' | 'cash' | 'other'
  reference       text,                        -- UPI ref / transaction ID
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_pkey        PRIMARY KEY (id),
  CONSTRAINT payments_lead_fkey   FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT payments_type_check  CHECK (type   IN ('upfront', 'final')),
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'paid'))
);

-- 3. Row-level security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users manage payments" ON public.payments;
CREATE POLICY "Authenticated users manage payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Done. Verify with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'project_value';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'payments';
