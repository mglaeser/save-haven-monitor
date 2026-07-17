# Setup-Guide für Dummies — Pages auf „Deploy from GitHub Actions" umstellen

Alles Code-seitige ist vorbereitet (`verify.yml`, `deploy.yml`, Lockfile, Gate). Es fehlen nur ein
paar **Klicks in den GitHub-Einstellungen**, die nur du machen kannst. Reihenfolge einhalten.

> **Wichtig:** Erst wenn Schritt 3 gemacht ist, veröffentlicht der neue Workflow wirklich. Vorher baut
> und prüft er nur — der letzte Deploy-Schritt hat noch kein Ziel (das ist normal, kein Fehler).

---

## Schritt 0 — Voraussetzung
Der Branch mit diesen Änderungen muss auf `main` gemerged sein (der `deploy`-Workflow läuft nur auf
`main`). Wenn ein PR offen ist: erst mergen.

## Schritt 1 — Pages-Quelle auf „GitHub Actions" umstellen  ⭐ das ist der eigentliche Schalter
1. Repo öffnen → oben **Settings**.
2. Linke Leiste → **Pages**.
3. Unter **Build and deployment → Source** das Dropdown von **„Deploy from a branch"** auf
   **„GitHub Actions"** stellen.
4. Fertig. (Kein Speichern-Knopf nötig — die Auswahl greift sofort.)

Ab jetzt serviert Pages nicht mehr die Roh-Dateien aus `main`, sondern das Artefakt, das der
`deploy`-Workflow baut **und vorher durch den Gate + die Acceptance-Suite geschickt hat**.

## Schritt 2 — Custom-Domain prüfen
1. Immer noch unter **Settings → Pages**.
2. Feld **Custom domain**: deine Domain sollte dort schon stehen (aus der `CNAME`-Datei). Falls leer:
   Domain eintragen → **Save**.
3. **Enforce HTTPS** anhaken (sobald verfügbar).
   *(Die `CNAME`-Datei wird vom Workflow automatisch ins Artefakt kopiert — die Domain bleibt.)*

## Schritt 3 — Den ersten Actions-Deploy auslösen
Zwei Wege, einer reicht:
- **Automatisch:** einen beliebigen Commit auf `main` pushen (oder Schritt 1 löst oft schon einen
  Lauf aus), **oder**
- **Manuell:** Repo → **Actions** → links Workflow **„deploy"** → rechts **„Run workflow"** →
  Branch `main` → **Run workflow**.

Dann unter **Actions** den Lauf öffnen. Erwartet: drei grüne Jobs nacheinander —
**`gate`** (Tests + Mutation + Gate + Acceptance) → **`build`** (Artefakt + Signatur) →
**`deploy`** (Veröffentlichung). Ist `gate` rot, wird **nicht** deployed — genau so soll es sein.

## Schritt 4 — Den Gate wirklich verpflichtend machen (schließt R-GATE ganz)
Damit auch ein direkter Push nichts Ungeprüftes veröffentlichen kann:
1. **Settings → Rules → Rulesets** (oder **Branches**) → dein Ruleset für `main` (oder neu anlegen).
2. Anhaken:
   - **Require status checks to pass** → in der Suche die Checks **`gate`** und **`acceptance`**
     hinzufügen (erscheinen, sobald der Workflow einmal lief).
   - **Block force pushes**.
   - **Require a pull request before merging** (empfohlen).
   - **Do not allow bypassing the above settings** (kein Bypass für Admins).
3. **Save**.

*(Test danach: ein `git push --force` auf `main` muss jetzt abgelehnt werden. Bisher ging er durch —
das war der offene Punkt R-GATE.)*

---

## Woran du erkennst, dass alles läuft
- **Actions**-Tab: `deploy` läuft grün durch, `deploy`-Job zeigt eine `page_url`.
- Deine Domain zeigt die Seite (Hard-Reload / Inkognito, falls der Browser cached).
- Beim Deploy-Lauf gibt es unter dem Artefakt eine **Attestation** (Provenance-Signatur) — der Beweis,
  welcher Commit welche Bytes erzeugt hat.

## Wenn etwas rot ist — kurze Fehlerkarte
| Symptom | Ursache | Fix |
|---|---|---|
| `deploy`-Job: „Pages site not configured" / „not enabled" | Schritt 1 fehlt | Source auf **GitHub Actions** stellen |
| `gate` rot | ein Test/der Gate schlägt fehl | **richtig so** — es wird nicht deployed; Log ansehen, Ursache fixen |
| `acceptance` rot | Parität gebrochen / Browser-Install | Log ansehen; die Suite ist eingefroren, also ist ein roter Lauf ein echtes Problem |
| Domain zeigt 404 | Custom domain / DNS | Schritt 2 prüfen; DNS zeigt auf GitHub Pages |
| Force-Push geht noch durch | Schritt 4 fehlt/unvollständig | Ruleset `main`: Checks required + Block force pushes |

## Zurückrollen (Break-Glass), falls Actions mal streikt
**Settings → Pages → Source** zurück auf **„Deploy from a branch"** (`main` / root). Dann serviert
Pages wieder direkt aus `main` wie früher. (Nur als Notnagel — der Gate ist dann wieder beratend.)

---

**Kurzfassung:** 1 Schalter (Pages-Source = GitHub Actions) macht es live; 1 Ruleset (Checks required
+ Force-Push blocken) macht den Gate verpflichtend. Der Rest ist schon im Repo.
