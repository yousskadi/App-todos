# ADR 001 - Sécurité du dépôt et de la chaîne CI/CD

- **Statut :** Accepté
- **Date :** 2026-07-07 (étape 12), complété le 2026-07-08 (étape 15, CodeQL)
- **Contexte :** dépôt public, image publiée sur GHCR et déployée dans le homelab

## Contexte

Le dépôt n'avait aucun scan (secrets, dépendances, conteneur, code) et la
chaîne CI/CD n'était pas durcie. Menace principale identifiée : l'exfiltration
de secrets par un job CI — action tierce compromise (cas réel :
`tj-actions/changed-files`, mars 2025), dépendance malveillante exécutée
pendant l'installation, ou PR piégée. Menace secondaire : livrer une image ou
du code vulnérable au homelab.

## Décision

Quatre scans bloquants dans la CI + durcissement des workflows + protection de
branche. Le détail pédagogique de chaque scan est dans
[docs/securite-ci.md](../securite-ci.md).

### Choix structurants

- **Le meilleur secret est celui qui n'existe pas** : aucun secret longue durée
  stocké dans le dépôt. La CI n'utilise que le `GITHUB_TOKEN` éphémère et des
  mots de passe jetables valables uniquement en CI. Si un déploiement distant
  exige un jour des credentials, préférer l'OIDC à un secret stocké.
- **`permissions: contents: read` global** sur les workflows, élévation job
  par job uniquement (`packages: write` pour publier l'image,
  `security-events: write` pour CodeQL). Un job compromis ne peut pas écrire
  dans le dépôt.
- **Actions tierces épinglées par SHA de commit** (pas par tag : un tag peut
  être déplacé vers du code malveillant, pas un SHA). Dependabot maintient les
  épinglages à jour chaque semaine.
- **Scans en jobs dédiés** (gitleaks, deps) plutôt que mélangés aux jobs de
  test : lisibilité des échecs et parallélisme.
- **Trivy scanne l'image avant sa publication** : le scan est dans le job
  `image`, entre le build et le push GHCR. Une image avec une CVE
  CRITICAL/HIGH corrigeable ne part jamais vers le homelab. L'image est aussi
  construite et scannée sur chaque PR pour détecter les problèmes avant merge.
- **Protection de branche `main`** : PR obligatoire, les 6 checks requis,
  force-push et suppression interdits. 0 approbation requise (dev solo) ;
  `enforce_admins` désactivé comme porte de sortie d'urgence.
- **Dependabot** sur les 4 écosystèmes (pip, npm, github-actions, docker).
  Politique de traitement : les mineures/patch vertes sont mergées au fil de
  l'eau ; les majeures sont examinées une par une (refus via
  `@dependabot ignore this major version` pour ne pas les revoir).

## Conséquences

- Toute PR paie ~1 à 2 minutes de scans supplémentaires ; c'est le prix d'un
  merge sans surprise.
- Les faux positifs de gitleaks (mots de passe factices des tests) sont
  allowlistés dans `.gitleaks.toml` — y ajouter les futurs cas de test.
- Merger une PR qui modifie `.github/workflows/` exige le scope OAuth
  `workflow` sur le token gh (`gh auth refresh -s workflow`).
- Les 5 bumps d'actions hebdomadaires touchent tous `ci.yml` : les merges
  successifs peuvent créer des conflits → `@dependabot rebase` puis merge.
- Le durcissement ne couvre pas le repo homelab (GitLab) : variables
  masquées/protégées et gestion des secrets côté cluster restent à traiter
  là-bas.
