import { Movie } from '../../../models/Movie.js';
import { Actor } from '../../../models/Actor.js';
import { withCatalogTransaction, allocateCatalogId } from '../../../services/catalog-transaction.service.js';
import { createCatalogMatchRepository } from './catalog-match.repository.js';
import { createCatalogReferenceRepository } from './catalog-reference.repository.js';
import { createCatalogMatcher, catalogMatcher } from '../services/catalog-match.service.js';
import { catalogReferenceRepository } from './catalog-reference.repository.js';
import type { CatalogSaveRepository } from '../types/catalog-save.types.js';

export const catalogSaveRepository: CatalogSaveRepository = {
  matcher: catalogMatcher,
  references: () => catalogReferenceRepository.load(),
  transaction(work) {
    return withCatalogTransaction(session => work({
      matcher: createCatalogMatcher(createCatalogMatchRepository(session)),
      references: () => createCatalogReferenceRepository(session).load(),
      nextId: kind => allocateCatalogId(kind, session),
      async insertActor(input) {
        await Actor.create([{ ...input.payload, id: input.id, catalogIdentity: input.identity, catalogResearch: input.research, catalogMediaKeys: input.mediaKeys }], { session });
      },
      async insertMovie(input) {
        await Movie.create([{ ...input.payload, id: input.id, catalogIdentity: input.identity, catalogResearch: input.research, catalogPosters: input.posters, catalogMediaKeys: input.mediaKeys }], { session });
      },
      async linkFranchise(movieId, relatedIds) {
        if (relatedIds.length) await Movie.updateMany({ id: { $in: relatedIds } }, { $addToSet: { franchiseMovieIds: movieId } }, { session });
      },
      async unreferencedMedia(keys) {
        if (!keys.length) return [];
        const movies = await Movie.find({ catalogMediaKeys: { $in: keys } }).select('+catalogMediaKeys').session(session).lean();
        const actors = await Actor.find({ catalogMediaKeys: { $in: keys } }).select('+catalogMediaKeys').session(session).lean();
        const used = new Set([...movies, ...actors].flatMap(row => row.catalogMediaKeys ?? []));
        return keys.filter(key => !used.has(key));
      },
    }));
  },
};
