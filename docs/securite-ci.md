# Comprendre les scans de sécurité de la CI

Guide de compréhension des 4 scans et du durcissement mis en place aux étapes
12 et 15. Pour le *pourquoi* des choix, voir
[ADR 001](adr/001-securite-chaine-ci-cd.md). Chaque section répond aux mêmes
questions : ça protège de quoi, ça tourne quand, et que faire quand ça échoue.

## Vue d'ensemble

```
PR ouverte
 ├── gitleaks   → des secrets ont-ils fuité dans le code ou l'historique ?
 ├── deps       → nos dépendances ont-elles des vulnérabilités connues (CVE) ?
 ├── backend / frontend / e2e   (tests, inchangés)
 ├── image      → build Docker, puis Trivy : l'image contient-elle des CVE ?
 └── CodeQL     → notre propre code a-t-il des failles (injection, XSS…) ?

Merge sur main → mêmes checks, puis publication de l'image sur GHCR
                 (seulement si Trivy est passé)
```

## 1. gitleaks — scan de secrets

**Protège de quoi ?** Un mot de passe, un token API ou une clé privée commis
par erreur. Sur un dépôt public, un secret poussé est considéré compromis en
quelques minutes (des robots scannent GitHub en continu) — même supprimé au
commit suivant, il reste dans l'historique git.

**Comment ça marche ?** gitleaks parcourt **tout l'historique** (chaque commit,
pas seulement l'état actuel) avec des règles : motifs connus (`ghp_…` pour
GitHub, `AKIA…` pour AWS) et détection d'entropie (les vraies clés sont des
chaînes « aléatoires », un texte normal ne l'est pas).

**En cas d'échec :** regarder le rapport du job (fichier, ligne, commit).
- Vrai secret → le **révoquer immédiatement** (c'est lui la faille, pas le
  commit), puis le sortir du code. Réécrire l'historique est optionnel une
  fois le secret révoqué.
- Faux positif (mot de passe factice de test…) → l'allowlister dans
  `.gitleaks.toml`.

**Défense en profondeur :** GitHub *push protection* est aussi actif — il
bloque le push lui-même quand il reconnaît un format de secret connu.
gitleaks attrape en plus les motifs génériques.

## 2. deps — audit des dépendances (pip-audit + npm audit)

**Protège de quoi ?** Les vulnérabilités **connues** (CVE) dans les
bibliothèques qu'on utilise. La plupart des compromissions passent par une
dépendance vulnérable non mise à jour, pas par le code de l'app.

**Comment ça marche ?** Les versions exactes de nos dépendances sont comparées
aux bases publiques de vulnérabilités (PyPI advisories/OSV côté Python,
GitHub Advisory Database côté npm). `--audit-level=high` côté npm : seules
HIGH et CRITICAL font échouer le job.

**En cas d'échec :** le rapport donne le paquet, la CVE et la version
corrigée. Mettre à jour le paquet (souvent Dependabot a déjà ouvert la PR).
S'il n'y a pas encore de correctif : évaluer si le code vulnérable est
atteignable chez nous, et documenter la décision.

**Complément :** Dependabot ne se contente pas d'alerter, il ouvre des PR de
mise à jour hebdomadaires — le job `deps` est le filet si on prend du retard.

## 3. Trivy — scan de l'image Docker

**Protège de quoi ?** Les CVE dans ce que l'image embarque *en plus* de notre
code : l'OS de base (Debian de `python:3.12-slim`), ses paquets système
(openssl, glibc…), et les paquets Python installés. C'est cette image qui
tourne dans le homelab — c'est la surface d'attaque réelle en production.

**Comment ça marche ?** Trivy inventorie tout le contenu de l'image et le
compare aux bases de CVE. Réglages choisis :
- `severity: CRITICAL,HIGH` — on ne bloque pas sur du MEDIUM/LOW ;
- `ignore-unfixed: true` — une CVE **sans correctif disponible** ne fait pas
  échouer le build (on ne peut rien y faire) ; dès qu'un correctif sort, elle
  redevient bloquante.

**Placement clé :** le scan est entre le build et le push GHCR. Une image
vulnérable n'est **jamais publiée**, donc jamais déployée par ArgoCD.

**En cas d'échec :** le rapport indique le paquet et la version corrigée.
- Paquet de l'OS de base → reconstruire suffit souvent (le tag `3.12-slim`
  suit les correctifs Debian), sinon attendre/bumper l'image de base
  (Dependabot docker s'en charge).
- Paquet Python → bumper la dépendance dans `pyproject.toml`.
- Cas extrême (CVE non pertinente pour notre usage) → `.trivyignore` avec un
  commentaire justifiant.

## 4. CodeQL — analyse statique de notre code (SAST)

**Protège de quoi ?** Les failles dans **notre propre code**, celles
qu'aucune base de CVE ne connaît : injection SQL, XSS, path traversal,
secrets en dur, redirections ouvertes… C'est le complément des trois autres
scans, qui regardent ce qu'on *utilise*, pas ce qu'on *écrit*.

**Comment ça marche ?** CodeQL transforme le code en base de données
interrogeable et exécute les requêtes de sécurité de GitHub dessus, en
suivant les flux de données (ex. « une valeur venant d'une requête HTTP
atteint-elle une requête SQL sans validation ? »). Deux analyses : `python`
(backend) et `javascript-typescript` (frontend).

**Quand ?** Sur chaque PR (les *nouvelles* alertes introduites par la PR
apparaissent en check), chaque push main, et un cron hebdomadaire — les
règles CodeQL évoluent, une passe régulière attrape les nouveautés sans
attendre un commit.

**En cas d'alerte :** onglet **Security → Code scanning alerts** du repo.
Chaque alerte montre le chemin du flux de données incriminé. Corriger, ou
marquer *dismissed* avec une justification si c'est un faux positif.

## Le durcissement autour des scans

- **Aucun secret stocké dans le dépôt** : la CI n'utilise que le
  `GITHUB_TOKEN` éphémère (mort à la fin du job) et des mots de passe
  jetables valables uniquement en CI. Rien à voler.
- **`permissions: contents: read`** par défaut : même compromis, un job ne
  peut pas pousser de code, ni créer de release, ni toucher aux settings.
- **Actions épinglées par SHA** : `uses: actions/checkout@9c091bb… # v7` au
  lieu de `@v7`. Un tag peut être déplacé vers du code malveillant après
  coup ; un SHA est immuable. C'est la parade directe à l'attaque
  `tj-actions/changed-files` de mars 2025.
- **Protection de branche `main`** : PR obligatoire, les 6 checks verts
  requis, pas de force-push. Personne (y compris un token volé) ne pousse
  directement sur main.

## Réflexes au quotidien

| Situation | Réflexe |
|---|---|
| Un job de scan échoue sur ma PR | Lire le rapport du job : fichier/paquet + version corrigée y figurent toujours |
| gitleaks bloque un mot de passe de test | L'ajouter à `.gitleaks.toml` (chemin `backend/tests/`) |
| e2e échoue sur `playwright install` (erreur apt) | Flake des runners GitHub : relancer le job (`gh run rerun <id> --failed`) |
| PR Dependabot mineure/patch verte | Merger |
| PR Dependabot majeure | Examiner ; refuser proprement avec `@dependabot ignore this major version` |
| Alerte CodeQL | Security → Code scanning : suivre le flux de données montré, corriger ou justifier |
