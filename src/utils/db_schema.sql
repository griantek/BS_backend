create table public.activity_log (
  id serial not null,
  user_id uuid not null,
  action_type text not null,
  action_details text not null,
  resource_id integer null,
  resource_type text null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint activity_log_pkey primary key (id),
  constraint activity_log_user_id_fkey foreign KEY (user_id) references entities (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.bank_accounts (
  id uuid not null default gen_random_uuid (),
  account_name text not null,
  account_holder_name text not null,
  account_number text not null,
  ifsc_code text not null,
  account_type text null,
  bank text not null,
  upi_id text null,
  created_at timestamp without time zone null default now(),
  branch text null,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint bank_accounts_pkey primary key (id),
  constraint bank_accounts_upi_id_key unique (upi_id),
  constraint bank_accounts_account_type_check check (
    (
      account_type = any (
        array['Savings'::text, 'Current'::text, 'Other'::text]
      )
    )
  )
) TABLESPACE pg_default;

create table public.departments (
  id serial not null,
  name character varying(255) not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  exec_id character varying(255) not null default 'supAdmin'::character varying,
  constraint departments_pkey primary key (id)
) TABLESPACE pg_default;

create table public.entities (
  id uuid not null default extensions.uuid_generate_v4 (),
  username text not null,
  password text not null,
  email text not null,
  role integer null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  entity_type text not null default 'Executive'::text,
  constraint executive_pkey primary key (id),
  constraint fk_role foreign KEY (role) references roles (id),
  constraint executive_entity_type_check check (
    (
      entity_type = any (array['Executive'::text, 'Editor'::text])
    )
  )
) TABLESPACE pg_default;

create table public.journal_data (
  id serial not null,
  prospectus_id integer null,
  client_name text null,
  requirement text null,
  personal_email text null,
  assigned_to uuid null,
  journal_name text null,
  status text null,
  journal_link text null,
  username text null,
  password text null,
  orcid_username1 text null,
  password1 text null,
  paper_title text null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  status_link text null default 'https://dummyimage.com/16:9x1080/'::text,
  constraint journal_data_pkey primary key (id),
  constraint journal_data_applied_person_fkey foreign KEY (assigned_to) references entities (id) on delete set null,
  constraint journal_data_prospectus_id_fkey foreign KEY (prospectus_id) references prospectus (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.notifications (
  id serial not null,
  user_id uuid not null,
  type text not null,
  message text not null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references entities (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.permissions (
  id serial not null,
  name text not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  entity_type text null,
  constraint permissions_pkey primary key (id),
  constraint permissions_name_key unique (name)
) TABLESPACE pg_default;

create table public.prospectus (
  id serial not null,
  executive_id uuid not null,
  date date not null,
  email text not null,
  reg_id text not null,
  client_name text not null,
  phone text not null,
  department text null,
  state text null,
  tech_person text null,
  requirement text null,
  proposed_service_period text null,
  created_at timestamp without time zone null default now(),
  services text null,
  notes text null,
  next_follow_up date null,
  isregistered boolean not null default false,
  updated_at timestamp without time zone null default now(),
  constraint prospectus_pkey primary key (id),
  constraint prospectus_executive_id_fkey foreign KEY (executive_id) references entities (id) on delete set null
) TABLESPACE pg_default;

create table public.registration (
  id serial not null,
  prospectus_id integer not null,
  date date not null default CURRENT_DATE,
  services text null,
  init_amount numeric not null,
  accept_amount numeric null,
  discount numeric null,
  total_amount numeric not null,
  accept_period text null,
  pub_period text null,
  bank_id uuid null,
  status text not null,
  month integer not null,
  year integer not null,
  created_at timestamp without time zone null default now(),
  transaction_id integer null,
  notes text null,
  updated_at timestamp without time zone null default now(),
  assigned_to uuid null,
  constraint registration_pkey primary key (id),
  constraint registration_bank_id_fkey foreign KEY (bank_id) references bank_accounts (id) on delete set null,
  constraint registration_prospectus_id_fkey foreign KEY (prospectus_id) references prospectus (id) on delete CASCADE,
  constraint registration_transaction_id_fkey foreign KEY (transaction_id) references transactions (id) on delete set null
) TABLESPACE pg_default;

create table public.roles (
  id serial not null,
  name text not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  permissions jsonb null,
  constraint roles_pkey primary key (id),
  constraint roles_name_key unique (name)
) TABLESPACE pg_default;

create table public.services (
  id serial not null,
  service_name text not null,
  service_type text null,
  description text null,
  fee numeric not null,
  min_duration text null,
  max_duration text null,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint services_pkey primary key (id)
) TABLESPACE pg_default;

create table public."supAdmin" (
  id bigint generated by default as identity not null,
  username text null,
  password text null,
  created_at timestamp with time zone not null default now(),
  constraint supAdmin_pkey primary key (id)
) TABLESPACE pg_default;

create table public.transactions (
  id serial not null,
  transaction_type text not null,
  transaction_id text not null,
  amount numeric not null,
  transaction_date date not null,
  additional_info jsonb null,
  exec_id uuid null,
  updated_at timestamp without time zone null default now(),
  constraint transactions_pkey primary key (id),
  constraint transactions_exec_id_fkey foreign KEY (exec_id) references entities (id) on delete set null
) TABLESPACE pg_default;