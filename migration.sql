-- Migration: 3-better-fields-structure / M1 — Data Model & API
--
-- Run this against the live database before deploying the new backend image.
-- New tables (senses, grammar_patterns, example_sentences) are created
-- automatically by models.Base.metadata.create_all on startup.
--
-- Usage:
--   docker exec -i vademecum_db psql -U <user> -d <db> < migration.sql

-- Drop deprecated flat-text columns from words table
ALTER TABLE words DROP COLUMN IF EXISTS prepositions;
ALTER TABLE words DROP COLUMN IF EXISTS example_sentences;
ALTER TABLE words DROP COLUMN IF EXISTS idiomatic_usages;

-- Add verb morphology columns
ALTER TABLE words ADD COLUMN IF NOT EXISTS auxiliary_verb VARCHAR;
ALTER TABLE words ADD COLUMN IF NOT EXISTS principal_forms JSON;
