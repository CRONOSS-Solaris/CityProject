#!/usr/bin/env node
// @ts-check
/**
 * @fileoverview Walidator świeżości i spójności map AI_WORKFLOW.md w repo CityProject.
 * @module scripts/check-ai-workflow
 *
 * CityProject to repo nadrzędne grupujące pluginy Paper jako submoduły git
 * (każdy podprojekt = katalog z `build.gradle`). Ten skrypt jest odpowiednikiem
 * walidatora z qorid, zaadaptowanym do układu Gradle + submoduły (brak npm).
 *
 * Sprawdza (twarde błędy → exit 1):
 *  - istnienie hub AI_WORKFLOW.md w korzeniu,
 *  - per-repo AI_WORKFLOW.md dla każdego subprojektu Gradle (katalog z build.gradle),
 *  - rozwiązywalność wszystkich linków wewnętrznych (markdown) w mapach,
 *  - hub wymienia każdy wykryty subprojekt (po nazwie katalogu).
 *
 * Ostrzeżenia (nie przerywają — exit 0):
 *  - subprojekt zadeklarowany w .gitmodules bez build.gradle (jeszcze nie zbudowany),
 *  - per-repo mapa nie linkuje z powrotem do huba (../AI_WORKFLOW.md).
 *
 * Uruchomienie: `node scripts/check-ai-workflow.mjs`
 * Reguła nadrzędna: CLAUDE.md §13 (AI_WORKFLOW musi odzwierciedlać HEAD).
 *
 * Czysty Node — zero zależności.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** @type {string[]} */
const errors = []
/** @type {string[]} */
const warnings = []

/**
 * Wykrywa subprojekty (pluginy): katalogi z `build.gradle` w korzeniu workspace.
 * @returns {string[]} lista nazw katalogów
 */
function discoverRepos() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== 'scripts')
    .map((d) => d.name)
    .filter((name) => existsSync(join(ROOT, name, 'build.gradle')))
    .sort()
}

/**
 * Czyta nazwy submodułów z .gitmodules (path = ...).
 * @returns {string[]} lista ścieżek submodułów
 */
function gitmodulePaths() {
  const file = join(ROOT, '.gitmodules')
  if (!existsSync(file)) return []
  /** @type {string[]} */
  const out = []
  const re = /^\s*path\s*=\s*(.+)\s*$/gm
  let m
  const text = readFileSync(file, 'utf8')
  while ((m = re.exec(text))) out.push(m[1].trim())
  return out
}

/**
 * Wyłuskuje wewnętrzne cele linków markdown z treści pliku.
 * @param {string} text treść markdown
 * @returns {string[]} ścieżki względne (bez http/mailto/anchor)
 */
function internalLinks(text) {
  /** @type {string[]} */
  const out = []
  const re = /\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(text))) {
    let t = m[1].trim()
    if (/^(https?:|mailto:|#)/.test(t)) continue
    t = t.split('#')[0]
    if (t) out.push(t)
  }
  return out
}

const repos = discoverRepos()
const reposWithMap = repos.filter((r) => existsSync(join(ROOT, r, 'AI_WORKFLOW.md')))

// 0. Hub istnieje
const hubPath = join(ROOT, 'AI_WORKFLOW.md')
if (!existsSync(hubPath)) errors.push('Brak hub AI_WORKFLOW.md w korzeniu workspace.')

// 1. Każdy subprojekt Gradle ma AI_WORKFLOW.md
for (const r of repos) {
  if (!existsSync(join(ROOT, r, 'AI_WORKFLOW.md'))) {
    errors.push(`Subprojekt "${r}" ma build.gradle, ale brak ${r}/AI_WORKFLOW.md (reguła §13).`)
  }
}

// 1a. Submoduł zadeklarowany, ale jeszcze bez build.gradle (np. niezbudowany szkielet)
for (const p of gitmodulePaths()) {
  if (!repos.includes(p) && !existsSync(join(ROOT, p, 'build.gradle'))) {
    warnings.push(`Submoduł "${p}" z .gitmodules nie ma jeszcze build.gradle — pomijam w walidacji map.`)
  }
}

// 2. Linki wewnętrzne rozwiązywalne
const mapFiles = existsSync(hubPath)
  ? [hubPath, ...reposWithMap.map((r) => join(ROOT, r, 'AI_WORKFLOW.md'))]
  : reposWithMap.map((r) => join(ROOT, r, 'AI_WORKFLOW.md'))
let linkCount = 0
for (const f of mapFiles) {
  const dir = dirname(f)
  for (const link of internalLinks(readFileSync(f, 'utf8'))) {
    linkCount++
    if (!existsSync(resolve(dir, link))) {
      errors.push(`Martwy link: ${f.replace(ROOT, '.')} -> ${link}`)
    }
  }
}

// 3. Hub wymienia każdy wykryty subprojekt; per-repo mapa linkuje do huba
if (existsSync(hubPath)) {
  const hub = readFileSync(hubPath, 'utf8')
  for (const r of repos) {
    if (!hub.includes(r)) {
      errors.push(`Hub AI_WORKFLOW.md nie wymienia subprojektu "${r}".`)
    }
  }
}
for (const r of reposWithMap) {
  const map = readFileSync(join(ROOT, r, 'AI_WORKFLOW.md'), 'utf8')
  if (!map.includes('../AI_WORKFLOW.md')) {
    warnings.push(`Mapa ${r}/AI_WORKFLOW.md nie linkuje z powrotem do huba (../AI_WORKFLOW.md).`)
  }
}

// Raport
console.log(`AI_WORKFLOW check: ${mapFiles.length} map, ${linkCount} linków wewnętrznych, ${repos.length} subprojektów.`)
if (warnings.length) {
  console.log(`\n⚠ Ostrzeżenia (${warnings.length}):`)
  for (const w of warnings) console.log('  - ' + w)
}
if (errors.length) {
  console.log(`\n✗ BŁĘDY (${errors.length}):`)
  for (const e of errors) console.log('  - ' + e)
  console.log('\nMapy AI_WORKFLOW są nieaktualne/niespójne. Zaktualizuj je (CLAUDE.md §13).')
  process.exit(1)
}
console.log('\n✓ Wszystkie linki rozwiązane, hub spójny z listą subprojektów.')
