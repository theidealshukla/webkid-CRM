-- Invoices table for Webkid CRM
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.invoices (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number      text NOT NULL UNIQUE,          -- WK-2025-001
  lead_id             uuid NOT NULL,                 -- FK → leads (the client)
  payment_id          uuid,                          -- FK → payments (upfront or final)
  issued_date         date NOT NULL DEFAULT CURRENT_DATE,
  line_items          jsonb NOT NULL DEFAULT '[]',   -- [{desc, amount}]
  subtotal            numeric(12,2) NOT NULL DEFAULT 0,
  total               numeric(12,2) NOT NULL DEFAULT 0,
  amount_received     numeric(12,2) NOT NULL DEFAULT 0,
  balance_due         numeric(12,2) NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'paid'   -- paid | partial
    CHECK (status IN ('paid', 'partial')),
  payment_method      text,                          -- upi | bank | cash | other
  transaction_id      text,                          -- UTR / UPI ref number
  paid_date           date,
  notes               text,
  created_by          uuid,
  created_at          timestamptz DEFAULT now(),

  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id),
  CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Auto-increment invoice number per year: WK-YYYY-NNN
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  yr   text := to_char(now(), 'YYYY');
  seq  int;
BEGIN
  seq := nextval('public.invoice_seq');
  RETURN 'WK-' || yr || '-' || lpad(seq::text, 3, '0');
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_lead_id    ON public.invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_all ON public.invoices;
CREATE POLICY invoices_all ON public.invoices
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
