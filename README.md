# Notes collaboratives (Supabase)
1. Supabase → SQL Editor → coller `supabase/schema.sql` (par blocs si erreur) → Run.
2. Auth → Providers → Email : désactiver « Confirm email ».
3. `.env.local` : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (clé publishable).
4. `npm install` puis `npm run dev`.

Historique partagé : exécuter `supabase/recent-documents.sql` dans le SQL Editor Supabase. Cette migration conserve les données existantes et active les trois derniers documents consultés par les membres, séparément pour Notes et Invest. Les ouvertures sont enregistrées à partir de son activation.
