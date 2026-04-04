create extension if not exists pgcrypto;

create table if not exists public.app_documents (
  id text primary key default gen_random_uuid()::text,
  collection text not null,
  slug text null,
  email text null,
  user_id text null,
  status text null,
  sort_order integer not null default 0,
  is_active boolean null,
  is_visible boolean null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_documents_collection_idx on public.app_documents (collection);
create index if not exists app_documents_collection_slug_idx on public.app_documents (collection, slug);
create index if not exists app_documents_collection_email_idx on public.app_documents (collection, email);
create index if not exists app_documents_collection_user_idx on public.app_documents (collection, user_id);
create index if not exists app_documents_collection_status_idx on public.app_documents (collection, status);
create index if not exists app_documents_collection_sort_idx on public.app_documents (collection, sort_order, updated_at desc);

create unique index if not exists app_documents_unique_slug_idx
  on public.app_documents (collection, slug)
  where slug is not null;

create unique index if not exists app_documents_unique_email_idx
  on public.app_documents (collection, email)
  where email is not null;

create or replace function public.set_app_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists app_documents_set_updated_at on public.app_documents;

create trigger app_documents_set_updated_at
before update on public.app_documents
for each row
execute function public.set_app_documents_updated_at();

alter table public.app_documents enable row level security;

drop policy if exists "service role full access on app_documents" on public.app_documents;

create policy "service role full access on app_documents"
on public.app_documents
for all
to service_role
using (true)
with check (true);
