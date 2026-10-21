# 07 · Premier message à coller dans Claude Code

Colle le bloc ci-dessous tel quel dans Claude Code, lancé à la racine du dossier `hushyboard`.

```
Tu reprends le projet Hushyboard et tu vas coder tout le dashboard. Je suis le product owner : je teste, je merge et je gère les comptes (GitHub, Vercel, Google).

1. Lis d'abord CLAUDE.md, puis tous les fichiers de docs/claude-code/ dans l'ordre (01 à 06), puis docs/claude-code/design/components.md. Ouvre aussi les maquettes : docs/claude-code/mockups/*.html (dans un navigateur ou en lisant le HTML) et docs/claude-code/mockups/figma/*.png.
2. Lis la doc de Next 16 dans node_modules/next/dist/docs/ pour ce que tu vas utiliser (cacheComponents, proxy, Server Actions, cache).
3. Fais-moi un résumé en 10 lignes maximum de ce que tu as compris, avec les questions qui te bloquent vraiment. Ensuite, commence la phase 0 de docs/claude-code/05-roadmap.md.

Règles :
- Le code est 100 % en anglais. Seuls les textes affichés à l'écran sont en français.
- Une phase = une branche = une PR, avec une checklist « Comment tester » en français.
- Arrête-toi à la fin de chaque phase, et dès que tu as besoin d'une action de ma part (marquée ⚑ dans la roadmap). Dans ce cas, dis-moi exactement quoi faire.
```

## Pour les phases suivantes

Après avoir mergé une PR, envoie simplement :

```
PR de la phase N mergée et testée en prod. Passe à la phase N+1.
```

Si un test échoue :

```
Phase N : <ce qui ne marche pas>. Étapes pour reproduire : … Capture jointe. Corrige sur la même branche.
```
