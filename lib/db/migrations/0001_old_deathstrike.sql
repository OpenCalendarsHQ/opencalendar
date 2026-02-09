CREATE INDEX "calendar_accounts_user_id_idx" ON "calendar_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_accounts_user_email_unique" ON "calendar_accounts" USING btree ("user_id","email");--> statement-breakpoint
CREATE INDEX "calendars_account_id_idx" ON "calendars" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "event_instances_event_id_idx" ON "event_instances" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_instances_original_start_idx" ON "event_instances" USING btree ("original_start");--> statement-breakpoint
CREATE INDEX "event_recurrences_event_id_idx" ON "event_recurrences" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_calendar_id_idx" ON "events" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "events_start_time_idx" ON "events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "events_end_time_idx" ON "events" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "events_calendar_start_idx" ON "events" USING btree ("calendar_id","start_time");--> statement-breakpoint
CREATE INDEX "sync_states_account_id_idx" ON "sync_states" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sync_states_calendar_id_idx" ON "sync_states" USING btree ("calendar_id");