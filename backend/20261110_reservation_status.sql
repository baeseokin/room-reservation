-- New reservations are confirmed explicitly by the API.
-- Existing pending/cancel_requested rows require conflict review; do not bulk convert.
ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'approved';
