import { CATEGORY_RULES, CATALOG_CATEGORIES, COUNTRY_ALIASES, GENRE_ALIASES } from '../config/catalog-reference.config.js';
import { catalogNameKey } from '../utils/catalog-identity.js';
import { isPublicHttpsUrl } from '../validators/catalog.validator.js';
import { catalogReferenceRepository } from '../repositories/catalog-reference.repository.js';
import type { CatalogDraft } from '../types/catalog.types.js';
import type { CatalogReferenceFields, CatalogReferenceIssue, CatalogReferenceRepository, CatalogReferenceResult, CatalogReferenceSnapshot } from '../types/catalog-reference.types.js';

type Aliases = Record<string, readonly string[]>;
const aliasIndexes = new WeakMap<Aliases, Map<string, string[]>>();
function concepts(value: string, aliases: Aliases): string[] {
  let index = aliasIndexes.get(aliases);
  if (!index) {
    index = new Map();
    for (const [concept, names] of Object.entries(aliases)) for (const name of names) {
      const key = catalogNameKey(name), groups = index.get(key) ?? [];
      if (!groups.includes(concept)) groups.push(concept);
      index.set(key, groups);
    }
    aliasIndexes.set(aliases, index);
  }
  return index.get(catalogNameKey(value)) ?? [];
}
function findRows<T>(value: string, rows: T[], names: (row: T) => string[], aliases: Aliases): T[] {
  const key = catalogNameKey(value);
  if (!key) return [];
  const exact = rows.filter(row => names(row).some(name => catalogNameKey(name) === key));
  if (exact.length) return exact;
  const groups = concepts(value, aliases);
  return rows.filter(row => names(row).some(name => concepts(name, aliases).some(group => groups.includes(group))));
}
function issue(path: string, kind: CatalogReferenceIssue['kind'], value: string | null, message: string): CatalogReferenceIssue {
  return { path, kind, value, message, action: kind === 'unverified' ? 'research' : 'resolve-reference', blocking: true };
}
function canonical(value: string): boolean { return !!value && value === value.trim(); }

/** Pure resolution: return actual dictionary labels; never persist aliases or partially drop unknown values. */
export function resolveCatalogReferences(draft: CatalogDraft, snapshot: CatalogReferenceSnapshot): CatalogReferenceResult {
  const next = structuredClone(draft);
  next.movie.categoryName = null; next.movie.genre = { uz: [], ru: [] }; next.movie.filterGenre = [];
  next.movie.filterCountry = null; next.movie.specs.countries = [];
  next.movie.description.uz.country = null; next.movie.description.ru.country = null;
  const issues: CatalogReferenceIssue[] = [];
  const genreFact = draft.research.details?.genres;
  const countryFact = draft.research.details?.countries;
  const verified = (fact: typeof genreFact) => !!fact?.value?.length && fact.sources.some(source => isPublicHttpsUrl(source.url));
  if (!verified(genreFact)) issues.push(issue('research.details.genres', 'unverified', null, 'Research sourced movie genres before choosing catalogue labels.'));
  if (!verified(countryFact)) issues.push(issue('research.details.countries', 'unverified', null, 'Research sourced production countries, not filming locations or actor nationality.'));
  const genres: CatalogReferenceSnapshot['genres'] = [], countries: string[] = [];
  if (verified(genreFact)) for (const [index, value] of genreFact!.value!.entries()) {
    const path = `research.details.genres.${index}`;
    const rows = findRows(value, snapshot.genres, row => [row.name, row.nameRu], GENRE_ALIASES);
    if (!rows.length) issues.push(issue(path, 'missing', value, 'Genre is absent from the current dictionary; add/resolve it explicitly.'));
    else if (rows.length > 1) issues.push(issue(path, 'ambiguous', value, 'Several dictionary genres match; do not select arbitrarily.'));
    else if (!canonical(rows[0].name) || !canonical(rows[0].nameRu)) issues.push(issue(path, 'invalid-dictionary', value, 'The dictionary genre needs valid Uzbek and Russian labels.'));
    else if (!genres.some(row => row.name === rows[0].name)) genres.push({ ...rows[0] });
  }
  if (verified(countryFact)) for (const [index, value] of countryFact!.value!.entries()) {
    const path = `research.details.countries.${index}`;
    const rows = findRows(value, snapshot.countries, row => [row.name], COUNTRY_ALIASES);
    if (!rows.length) issues.push(issue(path, 'missing', value, 'Production country is absent from the current dictionary; never substitute another country.'));
    else if (rows.length > 1) issues.push(issue(path, 'ambiguous', value, 'Several dictionary countries match; do not select arbitrarily.'));
    else if (!canonical(rows[0].name)) issues.push(issue(path, 'invalid-dictionary', value, 'The dictionary country needs a valid canonical name.'));
    else if (!countries.includes(rows[0].name)) countries.push(rows[0].name);
  }
  const genreConcepts = genres.flatMap(row => [row.name, row.nameRu].flatMap(name => concepts(name, GENRE_ALIASES)));
  const categoryName = CATEGORY_RULES.find(rule => genreConcepts.includes(rule.genre))?.category ?? null;
  if (verified(genreFact) && genres.length && !categoryName)
    issues.push(issue('categoryName', 'unsupported-category', null, 'These verified genres have no configured active section; an explicit editorial rule is required.'));
  if (issues.length || !categoryName || !genres.length || !countries.length) return { ready: false, references: null, issues, draft: next };
  const references = { categoryName, genres, countries, primaryCountry: countries[0] };
  next.movie.categoryName = categoryName;
  next.movie.genre = { uz: genres.map(row => row.name), ru: genres.map(row => row.nameRu) };
  next.movie.filterGenre = genres.map(row => row.name);
  next.movie.filterCountry = countries[0]; next.movie.specs.countries = [...countries];
  // Description uses the same canonical dictionary labels as filters/specs.
  // Model translations remain research evidence, never another stored spelling.
  next.movie.description.uz.country = countries.join(', ');
  next.movie.description.ru.country = countries.join(', ');
  return { ready: true, references, issues: [], draft: next };
}

/** Recheck canonical values against a fresh snapshot before a later insert (e.g. after admin edits). */
export function validateCatalogReferenceValues(movie: CatalogReferenceFields, snapshot: CatalogReferenceSnapshot): CatalogReferenceIssue[] {
  const issues: CatalogReferenceIssue[] = [];
  if (!movie.categoryName || !CATALOG_CATEGORIES.some(category => category === movie.categoryName)) issues.push(issue('categoryName', 'stale-reference', movie.categoryName, 'Unknown active catalogue section.'));
  if (!movie.genre.uz.length || movie.genre.uz.length !== movie.genre.ru.length) issues.push(issue('genre', 'stale-reference', null, 'Resolved genre pairs are required.'));
  movie.genre.uz.forEach((name, index) => {
    if (snapshot.genres.filter(row => canonical(row.name) && canonical(row.nameRu) && row.name === name && row.nameRu === movie.genre.ru[index]).length !== 1)
      issues.push(issue(`genre.uz.${index}`, 'stale-reference', name, 'Genre pair no longer uniquely matches the dictionary.'));
  });
  const genreConcepts = [...movie.genre.uz, ...movie.genre.ru].flatMap(name => concepts(name, GENRE_ALIASES));
  if (movie.categoryName && CATEGORY_RULES.find(rule => genreConcepts.includes(rule.genre))?.category !== movie.categoryName)
    issues.push(issue('categoryName', 'stale-reference', movie.categoryName, 'Section does not match the configured genre classification.'));
  if (new Set(movie.genre.uz).size !== movie.genre.uz.length || new Set(movie.filterGenre).size !== movie.filterGenre.length)
    issues.push(issue('genre', 'stale-reference', null, 'Duplicate genre values must be resolved.'));
  if (!movie.filterGenre.length || movie.filterGenre.some(name => !movie.genre.uz.includes(name))) issues.push(issue('filterGenre', 'stale-reference', null, 'Genre filters must use the resolved genre names.'));
  if (!movie.specs.countries.length) issues.push(issue('specs.countries', 'stale-reference', null, 'Resolved production countries are required.'));
  movie.specs.countries.forEach((name, index) => {
    if (snapshot.countries.filter(row => canonical(row.name) && row.name === name).length !== 1) issues.push(issue(`specs.countries.${index}`, 'stale-reference', name, 'Country no longer uniquely matches the dictionary.'));
  });
  if (new Set(movie.specs.countries).size !== movie.specs.countries.length) issues.push(issue('specs.countries', 'stale-reference', null, 'Duplicate countries must be resolved.'));
  if (!movie.filterCountry || !movie.specs.countries.includes(movie.filterCountry)) issues.push(issue('filterCountry', 'stale-reference', movie.filterCountry, 'Primary country must be one of the resolved production countries.'));
  return issues;
}

export function createCatalogReferenceResolver(repository: CatalogReferenceRepository = catalogReferenceRepository) {
  return { async resolve(draft: CatalogDraft) { return resolveCatalogReferences(draft, await repository.load()); } };
}
export const catalogReferenceResolver = createCatalogReferenceResolver();
