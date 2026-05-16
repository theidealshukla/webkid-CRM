-- Drop the existing constraint if it's a CHECK constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;

-- Add the new constraint allowing 'addon'
ALTER TABLE payments ADD CONSTRAINT payments_type_check CHECK (type IN ('upfront', 'final', 'addon'));

-- Note: If 'type' is actually an ENUM instead of a text column with a CHECK constraint, you would run:
-- ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'addon';
