# Notes collaboratives (Supabase)
1. Supabase → SQL Editor → coller `supabase/schema.sql` (par blocs si erreur) → Run.
2. Auth → Providers → Email : désactiver « Confirm email ».
3. `.env.local` : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (clé publishable).
4. `npm install` puis `npm run dev`.

Historique partagé : exécuter `supabase/recent-documents.sql` dans le SQL Editor Supabase. Cette migration conserve les données existantes et active les trois derniers documents consultés par les membres, séparément pour Notes et Invest. Les ouvertures sont enregistrées à partir de son activation.

Fond animé : adaptation du composant [Aurora de React Bits](https://github.com/DavidHDev/react-bits/tree/main/src/content/Backgrounds/Aurora), avec rendu limité à 30 images/s, arrêt en mouvement réduit et repli sans WebGL. Licence conservée dans `components/vendor/react-bits/LICENSE.md`.

Tableaux blancs : **Nouveau → Nouveau tableau blanc** crée une carte mentale dans le projet ou le dossier courant. Double-cliquer un bloc modifie son texte ; Tab ajoute une branche, Entrée une idée sœur, Ctrl+Z annule. Le tableau propose des liaisons, couleurs, formes, un rangement automatique et le zoom. Les données utilisent `items.type = 'board'` et `items.ydoc`, déjà présents dans le schéma ; aucune migration SQL n’est nécessaire. Un brouillon local permet de reprendre une sauvegarde interrompue sur le même navigateur.
