# Rojiblanca — refonte 2026 (prototype)
Prototype statique multi-pages basé sur les données fournies.

Pages:
- index.html — accueil
- equipe.html — effectif par poste
- resultats.html — filtres foot à 7/11 et amical/championnat/coupe
- statistiques.html — KPIs + podium des joueurs décisifs
- joueur.html?id=1 — fiche individuelle dynamique

Les JSON d'origine sont conservés dans data/.
Le prototype peut être ouvert via un petit serveur local (ex. `python -m http.server`) afin que les fetch JSON fonctionnent.

Note: les données fournies ne contiennent pas de date de match. Les résultats sont donc affichés dans l'ordre des identifiants, inversé pour montrer les plus récents en premier. Pour un tri chronologique réel, ajouter un champ `date` dans matchs.json.

La fiche joueur inclut aussi les pourcentages victoire/nul/défaite calculés uniquement sur les matchs où le joueur est présent, ainsi que les rangs buts/passes/décisivité avec les mêmes filtres.
