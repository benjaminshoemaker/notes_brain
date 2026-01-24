-- Enable realtime for notes table
-- This allows the web app to receive live updates when notes are classified

ALTER PUBLICATION supabase_realtime ADD TABLE notes;
