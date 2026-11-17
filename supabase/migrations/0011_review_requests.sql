-- Solicitud automática de reseña al completar una cita.

alter table public.business_settings
  add column if not exists google_review_url text
    check (google_review_url is null or (char_length(google_review_url) <= 1000 and google_review_url ~ '^https://'));

comment on column public.business_settings.google_review_url is
  'Enlace público donde el cliente puede dejar una reseña. Si está vacío no se envían solicitudes.';

alter table public.notification_events
  drop constraint if exists notification_events_event_type_check;

alter table public.notification_events
  add constraint notification_events_event_type_check check (event_type in
    ('request_created', 'approved', 'rejected', 'modified', 'cancelled', 'reminder', 'review_request'));
