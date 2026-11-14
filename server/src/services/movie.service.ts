import { Movie } from '../models/Movie.js';
import { MovieComment } from '../models/MovieComment.js';
import { MovieReaction } from '../models/MovieReaction.js';
import { Wishlist } from '../models/Wishlist.js';
import { withCatalogTransaction, allocateCatalogId } from './catalog-transaction.service.js';
import {watchOptions} from '../utils/watch-options.js';

export async function getAllMovies() {
  return Movie.find().sort({ id: 1 }).lean();
}

export async function getMovieById(id: number) {
  const row=await Movie.findOne({ id }).select('+catalogResearch').lean();
  if(!row)return null;
  const watchUrls=watchOptions({watchUrl:row.watchUrl,watchUrls:[...(row.watchUrls??[]),
    ...(row.catalogResearch?.result?.uzbekLinks??[]).map((link:{url:string})=>link.url)]}).map(option=>option.url);
  if(watchUrls.some(url=>!row.watchUrls?.includes(url)))
    await Movie.updateOne({id},{$addToSet:{watchUrls:{$each:watchUrls}}},{timestamps:false})
      .catch(()=>{console.warn('[MOVIE_WATCH_OPTIONS] Legacy link update will retry on next read');});
  const {catalogResearch,...movie}=row;
  return {...movie,watchUrls};
}

export async function createMovie(input: Record<string, unknown>) {
  return withCatalogTransaction(async session => {
    const id = await allocateCatalogId('movie', session);
    const [doc] = await Movie.create([{ ...input, id }], { session });
    return doc.toObject();
  });
}

export async function updateMovie(id: number, input: Record<string, unknown>) {
  return Movie.findOneAndUpdate({ id }, { $set: input }, { returnDocument: 'after' }).lean();
}

export async function deleteMovie(id: number) {
  return withCatalogTransaction(async session => {
    const doc = await Movie.findOneAndDelete({ id }, { session }).lean();
    if (!doc) return null;
    await Movie.updateMany({ franchiseMovieIds: id }, { $pull: { franchiseMovieIds: id } }, { session });
    await MovieComment.deleteMany({ movieId: id }, { session });
    await MovieReaction.deleteMany({ movieId: id }, { session });
    await Wishlist.deleteMany({ movieId: id }, { session });
    return doc;
  });
}

export async function getMoviesByActorId(actorId: number) {
  return Movie.find({ actorIds: actorId }).sort({ id: 1 }).lean();
}

export async function upsertMovies(movies: Record<string, unknown>[]) {
  const results = [];
  for (const movie of movies) {
    const id = Number(movie.id);
    const doc = await Movie.findOneAndUpdate(
      { id },
      {
        $set: movie,
        $unset: {
          typeCategory: 1,
          movieDetailPoster: 1,
          trailersVideo: 1,
          homeImgPosterRu: 1,
          'description.uz.descriptionImg': 1,
          'description.ru.descriptionImg': 1,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    results.push(doc);
  }
  return results;
}
