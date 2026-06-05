# CityProject

Repo nadrzędne grupujące pluginy serwerowe Paper (Minecraft 1.21.x) jako **submoduły git**,
ze wspólną warstwą konwencji (układ plików, model dokumentacji, wersjonowanie, styl kodu).

| Submoduł | Opis | Wersja |
|---|---|---|
| [`CitySystem`](CitySystem/) | Plugin zarządzania miastami (dojrzały). | patrz `CitySystem/build.gradle` |
| [`ClassSystem`](ClassSystem/) | Plugin zarządzania klasami postaci (szkielet startowy). | `0.1.0` |

## Wspólne zasady

- **[`AI_WORKFLOW.md`](AI_WORKFLOW.md)** — hub nawigacyjny dla AI („gdzie co jest" + graf zależności) + per-plugin `*/AI_WORKFLOW.md`. Punkt startowy każdej pracy agenta. Świeżość pilnuje [`scripts/check-ai-workflow.mjs`](scripts/check-ai-workflow.mjs).
- **[`CLAUDE.md`](CLAUDE.md)** — wspólne konwencje wszystkich pluginów (czytane hierarchicznie przez Claude Code).
- **[`.claude/skills/`](.claude/skills/)** — wspólny zestaw skilli Spec Kit, dziedziczony przez podprojekty.
- Każdy plugin ma własny `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/TECH_DEBT.md`
  w tym samym schemacie — wzorcem referencyjnym jest CitySystem.

## Praca z submodułami

```bash
# Klon repo wraz z submodułami
git clone --recurse-submodules <url>

# Jeśli sklonowano bez submodułów — inicjalizacja
git submodule update --init --recursive

# Praca w podprojekcie: wejdź do katalogu, commituj normalnie w jego repo.
# Po zmianie w submodule zaktualizuj wskaźnik w repo nadrzędnym:
git add CitySystem        # lub ClassSystem
git commit -m "Bump <plugin> submodule"
```

> **Status: lokalne.** Submoduły wskazują na razie ścieżki lokalne (`.gitmodules`). Po założeniu
> zdalnych repozytoriów podmień `url` w `.gitmodules` na właściwe remote i wykonaj
> `git submodule sync`.

## Build

Każdy plugin buduje się niezależnie własnym wrapperem Gradle:

```bash
cd CitySystem && ./gradlew build      # JAR w build/libs/
cd ClassSystem && ./gradlew build
```
