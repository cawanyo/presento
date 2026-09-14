/*
# Enable Supabase Realtime on all tables

## Changes
- Add tables responses, participants, and presentations to the supabase_realtime publication
- This enables the postgres_changes events (INSERT, UPDATE) that the frontend subscribes to

## Why
Without these tables in the publication, realtime subscriptions silently receive no events.
The admin's live view and the participant's view both depend on realtime updates.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE responses;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE presentations;