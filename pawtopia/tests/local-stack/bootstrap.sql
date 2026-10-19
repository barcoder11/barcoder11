-- Recreates the parts of a hosted Supabase database that Pawtopia's
-- migrations depend on (roles, schemas, default grants). Used only by the
-- Docker-free local verification stack in this folder; `supabase start`
-- provides all of this automatically.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password 'postgres';
grant anon, authenticated, service_role to authenticator;

create role supabase_auth_admin login noinherit createrole password 'postgres';
create role supabase_storage_admin login noinherit createrole bypassrls password 'postgres';
grant anon, authenticated, service_role to supabase_storage_admin;

create schema auth authorization supabase_auth_admin;
grant create on database postgres to supabase_auth_admin;
alter role supabase_auth_admin set search_path = 'auth';

create schema storage authorization supabase_storage_admin;
grant create on database postgres to supabase_storage_admin;
alter role supabase_storage_admin set search_path = 'storage';

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

-- Hosted Supabase grants these broadly and relies on RLS; we mirror that so
-- the migrations are tested under the same (permissive) baseline.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
