-- ============================================================
-- INSTALLMENT PAYMENTS MIGRATION
-- Run this in your Supabase SQL Editor BEFORE deploying code:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Drop the old type constraint that only allowed 'upfront' | 'final'
-- (the app already uses 'addon' so this likely already failed silently;
--  this migration makes all four types official)
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_type_check;

-- Re-add with all four valid types
ALTER TABLE public.payments
  ADD CONSTRAINT payments_type_check
  CHECK (type IN ('upfront', 'final', 'addon', 'installment'));

-- Done. Verify with:
-- SELECT conname, consrc FROM pg_constraint WHERE conname = 'payments_type_check';
