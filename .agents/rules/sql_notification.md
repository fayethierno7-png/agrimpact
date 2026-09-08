# Notification systématique des scripts SQL à exécuter

À CHAQUE FOIS qu'une modification nécessite l'exécution d'un script SQL ou d'une migration dans Supabase :
1. **Alerter explicitement l'utilisateur** dès la fin de la réponse avec un encadré très visible : "⚠️ ACTION REQUISE DANS SUPABASE".
2. **Fournir le chemin du fichier SQL** (avec lien cliquable `file://`) ou le code SQL exact à copier.
3. **Expliquer clairement où et comment le coller** : indiquer d'ouvrir le *SQL Editor* dans le dashboard Supabase, de coller le script et de cliquer sur *Run*.
4. **Vérifier l'absence d'erreurs récurrentes** : toujours s'assurer que les tables ou colonnes référencées (`user_id`, `id`, `auth.users`, etc.) correspondent exactement aux types et schémas existants dans Supabase.
