# AI_WORKFLOW — CityProject (hub nawigacyjny dla AI)

> **Po co ten plik:** szybka, **zawsze świeża** mapa „gdzie co jest" w całym repo nadrzędnym, pisana dla
> agentów AI (Claude Code, Codex, …). Zacznij **tutaj**, potem wejdź w `AI_WORKFLOW.md` konkretnego pluginu.
> Każdy plugin linkuje z powrotem do tego huba i do sąsiada.
> **Reguły nadrzędne:** [`CLAUDE.md`](CLAUDE.md) (sekcja §13 opisuje obowiązek aktualizacji tego pliku).
> **Dla ludzi:** [`README.md`](README.md).

> ⚠️ **Reguła świeżości (skrót):** ten plik i per-plugin `AI_WORKFLOW.md` muszą odzwierciedlać **realny kod**,
> nie zamierzenia. Gdy zmieni się struktura pakietów, lista komend/permissions, zależności od zewnętrznych
> pluginów albo dojdzie/zniknie podprojekt — zaktualizuj odpowiedni `AI_WORKFLOW.md` w **tym samym commicie**.
> Gdy kod rozjeżdża się z `CLAUDE.md`, źródłem prawdy jest kod.

---

## 1. Mapa repozytoriów (submoduły git)

CityProject grupuje pluginy serwerowe **Paper (Minecraft 1.21.x, Java 21, Gradle)** jako submoduły.
Każdy plugin to **samodzielny projekt Gradle** z własnym repo, wersjonowaniem i CI.

| Submoduł | Pakiet Java | Rola (jedna linia) | Mapa AI |
|---|---|---|---|
| [`CitySystem`](CitySystem/) | `cronos.citysystem` | **Plugin miast** (dojrzały): miasta, role/uprawnienia, skarbce, wojny, sojusze, aukcje, rankingi PvP, hologramy, granice. Persystencja write-behind cache. | [AI_WORKFLOW](CitySystem/AI_WORKFLOW.md) |
| [`ClassSystem`](ClassSystem/) | `cronos.classsystem` | **Plugin klas postaci** (szkielet startowy): warstwa config/tłumaczeń, baza komend (`/klasa`), logowanie. Domeny dopiero powstają. | [AI_WORKFLOW](ClassSystem/AI_WORKFLOW.md) |

> Wzorcem referencyjnym konwencji jest **CitySystem** — gdy schemat jest niejasny, sprawdź jak rozwiązuje
> to CitySystem i powiel układ w pozostałych pluginach.

---

## 2. Graf zależności

Rozróżniamy **dwa rodzaje krawędzi** — nie myl ich:

* **build-time (import/Gradle)** — zależność kompilacji (`build.gradle dependencies {}`, wspólny moduł).
* **runtime** — interakcja działających pluginów na serwerze Paper (Bukkit API, soft-dep przez refleksję,
  PlaceholderAPI, wspólna ekonomia). Niewidoczna dla kompilatora; istnieje tylko gdy serwer działa.

### 2.1 Build-time (między pluginami)

**Brak.** CitySystem i ClassSystem to niezależne projekty Gradle — nie współdzielą modułu kodu ani nie
importują się nawzajem (`compileOnly`/`implementation` każdego pluginu są osobne). Wspólny jest jedynie
**schemat konwencji** (nie kod) — patrz [§3](#3-wspólna-warstwa-konwencje-nie-kod).

### 2.2 Build-time (zależności zewnętrzne, `compileOnly`)

| Plugin | Zależności kompilacji (skrót) |
|---|---|
| `CitySystem` | `paper-api`, adventure, PlaceholderAPI, FancyHolograms, CoinsEngine, ExcellentEconomy, WorldGuard, sterowniki SQL (MariaDB/MySQL/SQLite) + HikariCP + Gson, Lombok; test: JUnit5/Mockito/MockBukkit |
| `ClassSystem` | `paper-api`, adventure, PlaceholderAPI, sterowniki SQL + HikariCP + Gson, Lombok; test: JUnit5/Mockito/MockBukkit (ten sam stack) |

### 2.3 Runtime (działające pluginy)

```
serwer Paper 1.21.x
 ├─ CitySystem  ── soft/hard-dep ─► PlaceholderAPI (req), FancyHolograms (req),
 │                                  CoinsEngine | ExcellentEconomy (opt, ekonomia), WorldGuard (opt)
 └─ ClassSystem ── soft-dep ─────► PlaceholderAPI (opt)
```

> **CitySystem ↔ ClassSystem (runtime):** obecnie **brak** bezpośredniej krawędzi — żaden z pluginów nie
> woła API drugiego. Gdyby w przyszłości ClassSystem czytał dane miast (np. klasa zależna od miasta) albo
> wystawiał placeholdery konsumowane przez CitySystem — dopisz krawędź tutaj i w obu per-plugin mapach.

---

## 3. Wspólna warstwa (konwencje, NIE kod)

Pluginy nie dzielą kodu, ale dzielą **schemat** wymuszany przez repo nadrzędne (czytany hierarchicznie):

| Element | Lokalizacja | Co daje |
|---|---|---|
| Wspólne konwencje | [`CLAUDE.md`](CLAUDE.md) | Układ plików, model dokumentacji, wersjonowanie, styl kodu, dyscyplina commitów, response discipline. Dziedziczone przez oba pluginy. |
| Skille Spec Kit | [`.claude/skills/`](.claude/skills/) | `speckit-*` dziedziczone hierarchicznie przez podprojekty. |
| Schemat dokumentacji | per-plugin `README.md` + `docs/ARCHITECTURE.md` + `docs/TECH_DEBT.md` | Ten sam podział w każdym pluginie (wzorzec: CitySystem). |

Każdy plugin trzyma też **własny** `CLAUDE.md` (specyfika) i **własny** `AI_WORKFLOW.md` (mapa kodu).

---

## 4. Najczęstsze zadania → gdzie iść

| Chcę… | Plugin / plik startowy |
|---|---|
| Pracować nad miastami, wojnami, aukcjami, GUI, skarbcem | [`CitySystem/AI_WORKFLOW.md`](CitySystem/AI_WORKFLOW.md) |
| Pracować nad klasami postaci | [`ClassSystem/AI_WORKFLOW.md`](ClassSystem/AI_WORKFLOW.md) |
| Dodać/zmienić tłumaczenie lub klucz config | per-plugin `src/main/resources/{config.yml,Translations/*.yml}` (wzorzec w obu mapach) |
| Dodać subkomendę | per-plugin `commands/` + `Translations/*.yml` (procedura w mapie i lokalnym `CLAUDE.md`) |
| Zmienić wspólną konwencję (dotyczy >1 pluginu) | [`CLAUDE.md`](CLAUDE.md) (root), NIE lokalny |
| Zbudować plugin | `cd <Plugin> && ./gradlew build` → JAR w `build/libs/` |
| Praca z submodułami / push | [`README.md`](README.md) (sekcja „Praca z submodułami") |

---

## 5. Konwencja per-plugin `AI_WORKFLOW.md`

Każdy plugin ma `AI_WORKFLOW.md` w swoim korzeniu z sekcjami: **Rola**, **Gdzie co jest** (tabela pakietów/ścieżek),
**Sąsiedzi** (link do huba + drugiego pluginu + rozróżnienie build-time vs runtime), **Dev** (komendy Gradle),
**Świeżość**. Linkuj „każde do każdego" przez te pliki, nie kopiuj treści. Przy sąsiadach zaznaczaj, czy
krawędź jest **build-time** (import/Gradle) czy **runtime** (Bukkit/soft-dep) — i czy realna, czy planowana.

---

## 6. Walidacja świeżości (automat)

Przed merge uruchom **[`scripts/check-ai-workflow.mjs`](scripts/check-ai-workflow.mjs)**:

```powershell
node scripts/check-ai-workflow.mjs
```

Sprawdza (twardo, exit 1): istnienie huba + per-plugin `AI_WORKFLOW.md` dla każdego subprojektu Gradle
(katalog z `build.gradle`), rozwiązywalność **wszystkich** linków wewnętrznych w mapach oraz to, że hub
wymienia każdy wykryty subprojekt. Ostrzeżenia (exit 0): submoduł bez `build.gradle`, brak linku zwrotnego
do huba. Czysty Node, zero zależności. Szczegóły i Definition of Done: [`CLAUDE.md`](CLAUDE.md) §13.
