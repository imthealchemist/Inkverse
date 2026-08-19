-- ============================================================
-- SOLID INK NOVEL — Supabase schema
-- Run ONCE: Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================
-- All app data lives in these tables. RLS is enabled with NO policies,
-- so only the service_role key (held by the Railway backend) can access
-- them — the anon key and the frontend can never read or write them.
-- ============================================================

create table if not exists users          (id text primary key, data jsonb not null);
create table if not exists sessions       (id text primary key, data jsonb not null);
create table if not exists genres         (id text primary key, data jsonb not null);
create table if not exists novels         (id text primary key, data jsonb not null);
create table if not exists chapters       (id text primary key, data jsonb not null);
create table if not exists bookmarks      (id text primary key, data jsonb not null);
create table if not exists history        (id text primary key, data jsonb not null);
create table if not exists follows        (id text primary key, data jsonb not null);
create table if not exists verifications  (id text primary key, data jsonb not null);
create table if not exists reports        (id text primary key, data jsonb not null);

alter table users         enable row level security;
alter table sessions      enable row level security;
alter table genres        enable row level security;
alter table novels        enable row level security;
alter table chapters      enable row level security;
alter table bookmarks     enable row level security;
alter table history       enable row level security;
alter table follows       enable row level security;
alter table verifications enable row level security;
alter table reports       enable row level security;

-- Public bucket for book covers (uploads still happen through the backend
-- with the service_role key; the public only gets read URLs).
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;
