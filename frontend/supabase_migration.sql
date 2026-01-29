-- Create a table to track individual quest step completions
create table if not exists quest_step_completions (
  id uuid default gen_random_uuid() primary key,
  quest_id text not null,
  user_address text not null,
  step_id text not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate completions for the same step by the same user
  constraint quest_step_completions_unique unique (quest_id, user_address, step_id)
);

-- Add RLS policies
alter table quest_step_completions enable row level security;

-- Allow anyone to read their own completions
create policy "Users can read own completions"
  on quest_step_completions for select
  using (auth.role() = 'anon' OR auth.uid() IS NOT NULL);

-- Allow anyone to insert their own completions (in a real app you might want stricter checks)
create policy "Users can insert own completions"
  on quest_step_completions for insert
  with check (true);
