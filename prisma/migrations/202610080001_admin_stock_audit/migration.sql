ALTER TABLE stock_movements ADD COLUMN "actorId" TEXT, ADD COLUMN reason TEXT;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_actor_fkey FOREIGN KEY ("actorId") REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reason_length CHECK (reason IS NULL OR char_length(reason) BETWEEN 1 AND 300);
CREATE INDEX stock_movements_actor_idx ON stock_movements("actorId");
