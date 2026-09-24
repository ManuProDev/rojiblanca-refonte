# Rojiblanca FC — refonte 2026

Refonte statique basée directement sur l’architecture et les données du site fourni.

## Pages
- index.html — accueil / dernier résultat / KPIs / podium / derniers matchs
- team.html — effectif par poste
- results.html — filtres équipe + enjeu
- stats.html — dashboard statistiques + podium + classement complet
- player.html?id=ID — fiche individuelle avec filtres, W/D/L, buts, passes et rangs

## Données
Les fichiers JSON du projet original sont conservés sans modification. Aucun résultat, joueur ou date n’a été inventé. Les matchs restent ordonnés par identifiant car le modèle de données fourni ne contient pas de date.

## Lancement
Les pages utilisent fetch() pour charger les JSON. Lancer un serveur local depuis le dossier, par exemple :
`python -m http.server 8000`
Puis ouvrir `http://localhost:8000/`.
