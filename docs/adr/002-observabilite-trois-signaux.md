# ADR 002 - Observabilité : les trois signaux derrière des flags

- **Statut :** Accepté
- **Date :** 2026-07-08 (étapes 13 et 14 ; traces à l'étape OTel du 2026-07-07)
- **Contexte :** le backend sert d'app démo à la stack observabilité du
  homelab (repo `homelab-cloud-prive` : kube-prometheus-stack, Loki, Tempo,
  Alloy)

## Contexte

Après les traces (OpenTelemetry → Alloy → Tempo), compléter les deux signaux
manquants : logs et métriques. La question centrale : quel transport pour
chaque signal, sachant que c'est la stack du homelab qui consomme.

## Décision

Un module par signal, même philosophie : **no-op par défaut, activé par une
variable d'environnement**. Le dev local garde son comportement d'origine ;
le homelab active tout dans ses manifestes.

| Signal | Module | Flag | Transport |
|---|---|---|---|
| Traces | `app/telemetry.py` | `OTEL_ENABLED` | push OTLP/gRPC → gateway Alloy → Tempo |
| Logs | `app/logging_config.py` | `LOG_JSON` | JSON sur stdout → fichiers du nœud → Alloy DaemonSet → Loki |
| Métriques | `app/metrics.py` | `METRICS_ENABLED` | `GET /metrics` scrapé par Prometheus (ServiceMonitor) |

### Choix structurants

- **Métriques en scrape, pas en push OTLP** : le homelab utilise
  kube-prometheus-stack avec `serviceMonitorSelectorNilUsesHelmValues: false`
  (tout ServiceMonitor du cluster est scruté). Un endpoint `/metrics` +
  ServiceMonitor est le chemin idiomatique ; l'OTLP push aurait exigé de
  câbler un pipeline métriques dans Alloy.
- **Corrélation logs ↔ traces** : chaque ligne de log émise pendant une
  requête tracée porte `trace_id`/`span_id` au format hexadécimal attendu par
  Grafana (derived field Loki → Tempo).
- **Méthode RED avec deux métriques seulement** : `http_requests_total`
  (débit via `rate()`, erreurs via le label `status`) et
  `http_request_duration_seconds` (latence en percentiles via
  `histogram_quantile()`).
- **Cardinalité bornée** : le label `route` est le gabarit
  (`/api/v1/tasks/{task_id}`), jamais le chemin réel — sinon chaque id créerait
  une série Prometheus. Piège FastAPI récent : l'inclusion paresseuse des
  routers (`_IncludedRouter`) fait que `scope["route"].path` ne contient plus
  le préfixe → le gabarit est reconstruit depuis `path_params`.
- **`/metrics` hors de `/api/v1`** : scrapé en direct sur le port du pod,
  jamais proxifié par nginx, donc jamais exposé au navigateur.
- Les métriques applicatives **complètent** le metrics-generator de Tempo
  (RED dérivé des spans) : ici c'est la vue de l'app elle-même, avec les
  statuts HTTP exacts.

## Conséquences

- Côté homelab, activer un signal = une variable d'env dans les manifestes
  (+ un ServiceMonitor pour les métriques). Aucun changement d'image.
- Le label `status` porte le code exact (200, 401, 404…) : les tableaux de
  bord agrègent par classe avec une regex (`status=~"5.."`).
- Les logs d'accès uvicorn passent aussi en JSON quand `LOG_JSON` est actif :
  tout le process parle le même format.
- Si une future route utilise un paramètre de type `path` (avec des `/`), la
  reconstruction du gabarit devra être revue.
