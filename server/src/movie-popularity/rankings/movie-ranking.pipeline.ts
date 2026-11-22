import type { PipelineStage } from 'mongoose';
import { Movie } from '../../models/Movie.js';

/** Shared public projection and stable order; neither ranking writes search counts. */
export function rankedMovieStages(): PipelineStage[] {
  return [
    { $lookup: { from: Movie.collection.name, localField: '_id', foreignField: 'id', as: 'movie' } },
    { $unwind: '$movie' }, { $limit: 10 },
    { $replaceRoot: { newRoot: { $mergeObjects: ['$movie', { searchCount: '$count' }] } } },
    { $project: { _id: 0, __v: 0, catalogResearch: 0 } },
  ];
}
