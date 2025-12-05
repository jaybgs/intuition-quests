# Supabase Database Setup

## ✅ Completed

1. ✅ **Installed Supabase client** (`@supabase/supabase-js`)
2. ✅ **Created Supabase configuration** (`src/config/supabase.ts`)
3. ✅ **Added environment variables** to `.env`

## Environment Variables Added

```env
SUPABASE_URL=https://cxelbkflhlrpboahxbkl.supabase.co
SUPABASE_ANON_KEY=sb_publishable_TQgrvIQsHEThWg18Ns4OKQ_Szsje89t
NEXT_PUBLIC_SUPABASE_URL=https://cxelbkflhlrpboahxbkl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_TQgrvIQsHEThWg18Ns4OKQ_Szsje89t
```

## Using Supabase in Your Code

### Import the client:

```typescript
import { supabase } from '../config/supabase';
```

### Example: Query data

```typescript
// Get all spaces
const { data: spaces, error } = await supabase
  .from('spaces')
  .select('*');

// Get spaces by owner
const { data, error } = await supabase
  .from('spaces')
  .select('*')
  .eq('owner_address', address);
```

### Example: Insert data

```typescript
const { data, error } = await supabase
  .from('spaces')
  .insert({
    name: 'My Space',
    owner_address: '0x123...',
    description: 'Description',
  });
```

### Example: Update data

```typescript
const { data, error } = await supabase
  .from('spaces')
  .update({ name: 'Updated Name' })
  .eq('id', spaceId);
```

## Database Tables Setup

You'll need to create tables in Supabase that match your data models:

- `spaces` - Store space information
- `quests` - Store quest data
- `users` - Store user information
- `quest_completions` - Track quest completions
- etc.

## Next Steps

1. **Create tables in Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/cxelbkflhlrpboahxbkl
   - Click "Table Editor"
   - Create tables matching your data models

2. **Update services to use Supabase:**
   - Replace Prisma queries with Supabase queries
   - Update `spaceService.ts`, `questService.ts`, etc.

3. **Set up Row Level Security (RLS):**
   - Configure access policies in Supabase dashboard

## Get Service Role Key (Recommended for Backend)

For admin operations, get the Service Role Key:

1. Go to Supabase Dashboard → Settings → API
2. Copy the **service_role** key (keep it secret!)
3. Add to `.env`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

---

**Supabase is now configured and ready to use!** 🚀

