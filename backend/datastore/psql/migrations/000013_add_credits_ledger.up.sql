BEGIN;

CREATE TABLE credits_ledger
(
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    org_id uuid NOT NULL,
    reference_id uuid,
    type character varying(50) NOT NULL,
    action character varying(100) NOT NULL,
    cost integer NOT NULL DEFAULT 0,
    amount integer NOT NULL DEFAULT 0,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE credits_ledger ADD CONSTRAINT fk1_credits_ledger_org FOREIGN KEY (org_id) REFERENCES organizations (id);
CREATE INDEX idx_credits_ledger_org_id ON credits_ledger (org_id);
CREATE INDEX idx_credits_ledger_org_reference_created_at ON credits_ledger (org_id, reference_id, created_at DESC);
CREATE INDEX idx_credits_ledger_org_type_created_at ON credits_ledger (org_id, type, created_at DESC);

COMMIT;
