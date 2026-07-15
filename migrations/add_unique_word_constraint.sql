DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'words_word_key'
    ) THEN
        ALTER TABLE words ADD CONSTRAINT words_word_key UNIQUE (word);
    END IF;
END $$;
