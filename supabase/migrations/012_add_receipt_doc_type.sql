-- Add 'receipt' to doc_type CHECK constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_doc_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN ('contract', 'estimate', 'warranty', 'receipt', 'other'));
