# CLAUDE.md — wspólne konwencje repo `CityProject`

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`CityProject` to repo nadrzędne grupujące pluginy serwerowe Paper jako **submoduły git**:

| Submoduł | Opis | Własny CLAUDE.md |
|---|---|---|
| [`CitySystem`](CitySystem/) | Plugin zarządzania miastami (dojrzały). | [`CitySystem/CLAUDE.md`](CitySystem/CLAUDE.md) |
| [`ClassSystem`](ClassSystem/) | Plugin zarządzania klasami postaci (szkielet startowy). | [`ClassSystem/CLAUDE.md`](ClassSystem/CLAUDE.md) |

**Ten plik trzyma zasady WSPÓLNE** dla wszystkich podprojektów (układ plików, model dokumentacji,
wersjonowanie, styl kodu, dyscyplina commitów, response discipline). Claude Code czyta `CLAUDE.md`
**hierarchicznie** — pracując wewnątrz podprojektu masz w kontekście ten plik **oraz** jego lokalny
`CLAUDE.md`. Specyfika danego pluginu (lifecycle, domeny, helpery, integracje) żyje w jego lokalnym
`CLAUDE.md`, nie tutaj.

> **Zasada przynależności reguły**: reguła ogólna (dotyczy >1 pluginu) → ten plik. Reguła zależna od
> konkretnego pluginu → jego lokalny `CLAUDE.md`. Nie duplikować reguł ogólnych w podprojektach.

> 🧠 **GŁÓWNA BAZA WIEDZY dla AI:** [`AI_WORKFLOW.md`](AI_WORKFLOW.md) (hub „gdzie co jest" + zależności,
> per-plugin `*/AI_WORKFLOW.md`) **oraz ten plik** (`CLAUDE.md` — zasady/konwencje). Te dwa to **źródło prawdy**
> dla każdego agenta — zacznij zawsze tu, dopiero potem czytaj kod. **Utrzymuj świeżość → §13.**

CitySystem jest **wzorcem referencyjnym** — gdy schemat jest niejasny, zajrzyj jak rozwiązuje to
CitySystem i powiel ten sam układ w pozostałych pluginach.

---

## 1. Typ projektu (każdy plugin)

- Paper plugin dla Minecraft 1.21.x, **Java 21**, Gradle (wrapper).
- Root pakietu Java: `cronos.<nazwapluginu>` (małe litery), np. `cronos.citysystem`, `cronos.classsystem`.
- **`paper-plugin.yml`** (nowszy loader Paper), NIE legacy `plugin.yml`. Komendy NIE są deklarowane
  w `paper-plugin.yml` — rejestrują się przez kod (refleksja na Bukkit `CommandMap`).
- Token `version` w `paper-plugin.yml` jest filtrowany przez `processResources` z `build.gradle`
  (`${version}`) — nie edytować ręcznie.

## 2. Język i styl

- **Komentarze, treści logów, wiadomości do gracza, wartości tekstowe w config/Translations — po polsku.**
- **Nazwy klas, metod, pól, pakietów oraz klucze `config.yml` / `Translations/*.yml` — po angielsku**,
  hierarchia kropkowa (np. `general.language`, `database.table-prefix`).
- Aliasy komend mogą być po polsku — żyją w plikach `Translations/*.yml`, nie w kodzie.

## 3. Układ plików (warstwy)

Pakiety odzwierciedlają warstwy. Nowy plik trafia do pasującego pakietu — **bez** `misc/` / `helpers/`
bez wyraźnej kategorii:

```
commands/            top-level dispatchery + ArgumentParser
commands/base/       abstrakcyjne klasy + interfejsy komend
commands/subcommands/<domena>/
services/            logika domenowa
db/                  CacheManager, executor, DatabaseManager
db/repositories/     SQL (source of truth), dziedziczą z BaseRepository
model/               modele domenowe
gui/ , gui/views/<domena>/
listeners/<domena>/
utils/               reużywalne helpery
```

Zasoby: `src/main/resources/` — `paper-plugin.yml`, `config.yml`, `Translations/{pl,en}.yml`,
`migrations/{NNN}_{nazwa}.sql` (składnia kompatybilna z **MySQL + MariaDB + SQLite** jednocześnie).

## 4. Styl kodu (corporate-grade readability)

- **Plik = jedna odpowiedzialność.** Klasa serwisowa > ~400 linii lub GUI > ~250 linii → sygnał do podziału.
- **Metoda < ~40 linii**, jeden poziom abstrakcji na metodę. Komentarze sekcyjne `// === krok 1 ===`
  w metodzie = znak, że to powinny być osobne metody prywatne.
- **Reużywalność przed kopiowaniem.** Zanim napiszesz helper — przeszukaj `utils/`, `db/`, `services/`,
  `gui/views/base/`, `commands/base/`. Trzy podobne wystąpienia = wydziel wspólny helper; dwa = jeszcze nie.
  Każdy plugin trzyma **rejestr istniejących helperów** w swoim lokalnym `CLAUDE.md` — przeczytaj go
  przed napisaniem nowego i dopisz nowy helper w tym samym commicie.
- **Nazewnictwo bez skrótów** (poza ogólnie znanymi: `uuid`, `id`, `db`).
- **Bez zbędnych komentarzy.** Komentarz ma wyjaśniać *dlaczego* i niespodzianki, nie powtarzać nazwy.
  Zbędne (do usunięcia / niepisania):
  - JavaDoc/komentarz klasy który tylko parafrazuje jej nazwę — np. `/** System kolorowych logów dla
    pluginu Klas. */` nad klasą `ColoredLogger`, albo `/** Główna klasa pluginu. */` nad `XxxPlugin`.
  - Komentarz typu „identyczny/taki sam jak X w innym pluginie" — to jest oczywiste z kodu i rozjeżdża
    się gdy jeden z nich się zmieni.
  - Getter/setter/override z JavaDokiem powtarzającym sygnaturę.

  Dozwolone i mile widziane: krótki JavaDoc na publicznej metodzie serwisu opisujący kontrakt/WHY,
  oraz komentarze tłumaczące nieoczywistą decyzję (np. „60-tickowy delay bo CoinsEngine ładuje się później").
- **Brak magic numbers** — `private static final` z mówiącą nazwą lub klucz w `config.yml` (wyjątki: 0, 1, -1).
- **Publiczne API serwisu = minimum.** Pola prywatne, helpery `private`.
- **Refaktor przy okazji = NIE**, chyba że poproszono. Bug fix nie ciągnie sprzątania okolicznego kodu;
  zauważony dług → wpis w `docs/TECH_DEBT.md`, nie inline.

## 5. Współbieżność i persystencja (gdy plugin ma warstwę danych)

- Pola dzielone między event handlerami (main thread) a schedulerami async → `ConcurrentHashMap` /
  `AtomicXxx` / `CopyOnWriteArrayList`.
- Bukkit API (wiadomości, inventory, świat, entity) wołać **wyłącznie z main thread**; w callbacku
  `CompletableFuture` użyj `getServer().getScheduler().runTask(plugin, ...)`. **Nie** używać
  `CompletableFuture.join()` / `.get()` — blokują wątek.
- SQL tylko przez repository (dziedziczące z `BaseRepository`), nigdy bezpośrednio z serwisu.
  Try-with-resources, log błędu przez `plugin.getLogger().log(Level.SEVERE, ..., e)`, return `Optional`/`false`.
- Operacje atomowe (transfer środków, własności) → jawna transakcja `setAutoCommit(false)` + `commit`/`rollback`.

## 6. Logowanie

- `plugin.getLogger().log(Level.SEVERE/WARNING, ..., e)` — wyjątki krytyczne / rzeczy które operator widzi.
- Verbose diagnostyka dev — przez własny `DebugLogger` gated configiem `debug.enabled`.
- **Anty-wzór: `e.printStackTrace()`** — nie używać; gubi formatowanie i poziom logowania.

## 7. Model dokumentacji (ten sam podział w każdym pluginie)

Po każdej merytorycznej zmianie kodu **bezwzględnie** aktualizujesz odpowiedni dokument **w tym samym
commicie**. Nieaktualna dokumentacja jest gorsza niż brak.

| Lokalizacja | Charakter | Co zawiera | Czego NIE zawiera |
|---|---|---|---|
| `README.md` | User-facing (operator/gracz) | Opis, instalacja, **pełna lista permissions**, komendy/aliasy, kluczowe sekcje `config.yml`. | Changelog, „co nowego", historia wersji, file:line. |
| `docs/ARCHITECTURE.md` | Techniczna (developer) | Co istnieje i jak działa, lifecycle, niezmienniki, file:line traces, kolejność onEnable/onDisable. | „Known issues", „naprawione w 1.x", plany, TODO. |
| `docs/TECH_DEBT.md` | Wewnętrzny dług kodu | Refaktor, persystencja, testy, proces. Trzyma file:line. | User-facing features, bieżący stan kodu, historia. |
| `git log` + tagi | Historia zmian. | | |

Plany produktowe / user-facing roadmapa danego pluginu mogą żyć w zewnętrznym narzędziu (np. Notion) —
adres i schemat opisuje lokalny `CLAUDE.md` tego pluginu (CitySystem: baza `TODO - MiastaRPG`).

**Doc-as-you-code (twarde reguły):**

- Każda nowa rzecz dokumentowana w **tym samym commicie**, w którym powstaje. Nigdy „kod teraz, dokumentacja jutro".
- Nowa permission → `README.md` (kompletna lista). Nowa subkomenda → `Translations/{pl,en}.yml` + README + ARCHITECTURE.
- Nowy klucz `config.yml` → komentarz przy kluczu + (jeśli istotny dla operatora) README.
- Nowa migracja SQL → ARCHITECTURE (lista migracji). Nowy helper → rejestr w lokalnym `CLAUDE.md`.
- **Anty-wzór**: nowy plik `PLAN-*.md` / `NOTES.md` / `TODO.md` w repo. Dług → `TECH_DEBT.md`, plany → narzędzie produktowe.

## 8. Build & test (ta sama konwencja)

- `./gradlew build` — pełny build, JAR w `build/libs/<Plugin>-<version>.jar`.
- `./gradlew check` → uruchamia source set `integrationTest`.
- **`./gradlew test` jest celowo wyłączony** (`test { enabled = false }`). Testy JUnit 5 / Mockito /
  MockBukkit pod `src/test/java` uruchamia się ad-hoc (tymczasowy `enabled = true`) lub przez IDE.
  Nie „naprawiać" tej flagi bez pytania użytkownika.
- `byte-buddy` i `asm` są force'owane (`resolutionStrategy`) dla zgodności Mockito 5 / Java 21 — nie bumpować bez testów.
- Po zmianie GUI/komendy: upewnij się że `./gradlew build` przechodzi, zanim zaraportujesz „gotowe".

## 9. Wersjonowanie (SemVer)

- **Po każdej merytorycznej zmianie** (feature, bugfix, refactor zmieniający zachowanie) → bump `version`
  w `build.gradle`. `X` = breaking, `Y` = nowy feature/migracja additive, `Z` = bugfix/refactor/optymalizacja.
- Czysto-dokumentacyjne zmiany w `CLAUDE.md` / `docs/` **nie** wymagają bumpa (nie zmieniają JAR). W razie wątpliwości → bump `Z`.
- Bump idzie w **tym samym commicie** co zmiana. Osobny „bump version" commit to anty-wzór.
- **GitHub Release powstaje automatycznie** po push na `master`/`main` (`.github/workflows/release.yml`):
  job czyta `version` z `build.gradle`, sprawdza czy `vX.Y.Z` istnieje (idempotentnie), buduje JAR i publikuje.

## 10. Commity i git

- **Małe commity, jasne wiadomości.** Jedna zmiana = jeden commit. Wiadomość imperatywna, opisuje WHY.
- **Bez trailera `Co-Authored-By: Claude ...`** — repozytoria nie używają tego oznaczenia. Jeśli domyślne
  instrukcje narzędzia każą go dopisać — pominąć.
- Submoduły: zmiana w podprojekcie = commit w jego repo; aktualizacja wskaźnika submodułu = osobny commit w repo nadrzędnym.

## 11. Plan przed kodem

- Dla zmian > ~50 linii lub > 2 plików: krótki plan w odpowiedzi (3-6 punktów: co / gdzie / dlaczego),
  zatwierdzenie użytkownika, dopiero edycja. Małe targetowane zmiany — od razu kod.

## 12. Spec Kit (`.claude/skills/`)

Repo nadrzędne dostarcza wspólny zestaw skilli **Spec Kit** (`speckit-specify`, `speckit-plan`,
`speckit-tasks`, `speckit-implement`, `speckit-clarify`, `speckit-analyze`, `speckit-checklist`,
`speckit-constitution`, `speckit-git-*`). Dziedziczone hierarchicznie przez wszystkie podprojekty.
Workflow speckit wymaga struktury `.specify/` w katalogu danego podprojektu (tworzonej przez `speckit-*`).

## 13. AI_WORKFLOW — mapa nawigacyjna (utrzymuj świeżość)

Repo ma dedykowaną **mapę dla AI**: hub [`AI_WORKFLOW.md`](AI_WORKFLOW.md) w korzeniu + `AI_WORKFLOW.md`
w korzeniu **każdego** pluginu. Pliki linkują „każde do każdego" (hub ⇄ plugin, plugin ⇄ sąsiad), żeby
agent szybko znalazł „gdzie co jest". Wzorowane na rozwiązaniu z repo `qorid`.

**13.1 Zasada startu (główna baza wiedzy).** `AI_WORKFLOW.md` + `CLAUDE.md` to **podstawowa wiedza i źródło
prawdy** dla każdego agenta AI w tym repo. Każdą pracę zaczynaj od nich: najpierw hub `AI_WORKFLOW.md`, potem
mapa pluginu + jego lokalny `CLAUDE.md`; dopiero potem kod. Mapy opisują **realny kod**; gdy dokument
(`CLAUDE.md`/`README`/mapa) rozjeżdża się z kodem, **źródłem prawdy jest kod** — a rozbieżność zapisz w
rejestrze [`AI_WORKFLOW.md` §7](AI_WORKFLOW.md) („Rozbieżności i wykryte błędy"). Wszystkie błędy strukturalne
wypisuje walidator (§13.3) — uruchom go, by zobaczyć pełną listę naraz.

**13.2 Reguła świeżości (OBOWIĄZKOWA).** `AI_WORKFLOW.md` musi być zawsze aktualny. W **tym samym
commicie**, który zmienia którekolwiek z poniższych, zaktualizuj odpowiedni `AI_WORKFLOW.md`:

- struktura pakietów/katalogów `src/` (dodanie/przeniesienie/usunięcie katalogu lub pliku wymienionego w mapie);
- lista komend / permissions / kluczy config / migracji SQL;
- rola pluginu, zależności (build-time Gradle, soft-dep runtime, zależności zewnętrzne), skrypty `build`/`test`;
- nowy/usunięty plugin (submoduł) → zaktualizuj **hub** (tabela repo + graf) i dodaj/usuń per-plugin plik.

**Definition of Done każdego commita:** jeśli zmiana dotyka powyższego, a `AI_WORKFLOW.md` nie jest
zaktualizowany — zmiana jest niekompletna. Aktualizacja mapy to część zadania, nie opcja. Mapa odzwierciedla
`HEAD`, nie plany.

**13.3 Walidator.** Przed merge uruchom [`scripts/check-ai-workflow.mjs`](scripts/check-ai-workflow.mjs):

```powershell
node scripts/check-ai-workflow.mjs
```

Sprawdza (twardo, exit 1): istnienie huba + per-plugin `AI_WORKFLOW.md` dla każdego subprojektu Gradle,
rozwiązywalność wszystkich linków wewnętrznych w mapach, to że hub wymienia każdy subprojekt, oraz
**kompletność** — każdy top-level pakiet/klasa pluginu (`src/main/java/cronos/<plugin>/*`) musi być
wymieniony w jego mapie. Ostrzeżenia (exit 0): submoduł bez `build.gradle`, brak linku zwrotnego do huba.
Czysty Node, zero zależności. Działa też w CI ([`.github/workflows/ai-workflow.yml`](.github/workflows/ai-workflow.yml)).

---

## Response discipline (assistant rules)

1. Nie znasz odpowiedzi → napisz „nie wiem". Nie zgaduj, nie wymyślaj API ani plików, których nie zweryfikowałeś.
2. Odpowiadaj tylko gdy jesteś pewny. Pewność wymaga sprawdzenia kodu/dokumentu → sprawdź, potem odpowiedz.
3. Myśl krok po kroku: ustal założenia, przeczytaj źródła, potem formułuj odpowiedź.
4. Najpierw cytuj, potem odpowiadaj — gdy pytanie dotyczy zawartości pliku, najpierw Read + cytat.
5. Doc-as-you-code (§7): każda nowa rzecz do dokumentacji w tym samym commicie.
6. Anty-duplikacja (§4): przed nowym helperem przeczytaj rejestr w lokalnym `CLAUDE.md`; wykrytą duplikację zgłoś.
