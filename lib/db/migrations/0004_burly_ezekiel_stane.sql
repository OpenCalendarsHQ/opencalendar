ALTER TABLE "user_settings" ADD COLUMN "event_border_style" text DEFAULT 'solid' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_border_width" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_corner_radius" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_opacity" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_font_size" text DEFAULT 'sm' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_padding" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "show_location_icon" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "show_time_in_compact" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_background_style" text DEFAULT 'solid' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_shadow" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "show_event_border" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "event_title_weight" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
CREATE INDEX "events_ics_uid_idx" ON "events" USING btree ("ics_uid");--> statement-breakpoint
CREATE INDEX "events_external_id_idx" ON "events" USING btree ("external_id");