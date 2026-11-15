# Schémas du dépôt

| Source | Export | Ce qu'il montre | Affiché dans |
|---|---|---|---|
| `app-todos.drawio` | `app-todos.png` | la CI GitHub, GHCR, et le déploiement sur le homelab et sur OpenShift | tête du [README](../../README.md) |

Une source et son export se commitent ensemble, dans la PR qui change ce que le
schéma dessine.

## Modifier le schéma

Ouvrir le `.drawio` dans [app.diagrams.net](https://app.diagrams.net) ou
l'extension draw.io de VS Code. Les logos sont embarqués dans le fichier
(images SVG en base64) : l'export ne dépend d'aucun accès réseau.

Le fichier doit garder son enveloppe `<mxfile>`. Un `<mxGraphModel>` nu
s'exporte en image vide, sans message d'erreur.

## Réexporter le PNG

Depuis la racine du dépôt :

```bash
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD/docs/diagrams":/data \
  rlespinasse/drawio-export@sha256:2c133c2bbb42ba97fb3c8aca83fd62be3927fef8c7caeba2673d4092b7f6c578 \
  --format png --scale 2 --output exported \
  && mv docs/diagrams/exported/app-todos-App-todos.png docs/diagrams/app-todos.png \
  && rmdir docs/diagrams/exported
```

- `--user` fait écrire le PNG avec ton utilisateur. Sans lui, le conteneur
  écrit en root et le fichier ne se déplace plus sans `sudo`.
- L'image est épinglée par digest (`drawio-exporter` 1.6.0) : un rendu ne
  change pas parce que l'image `latest` a bougé.

Relire le PNG avant de commiter : flèches qui traversent une boîte, libellés
qui se chevauchent, texte HTML affiché en brut.

## Ce que le schéma doit montrer

- Les checks requis de `main` et les jobs de `ci.yml` qui les produisent.
- Ce qui tourne sur chaque cluster, lu dans ses manifests : `k8s/todos-demo/`
  du homelab, `manifests/app-todos/` d'openshift-lab.
- Ce qui n'existe pas encore, en pointillés orange.
