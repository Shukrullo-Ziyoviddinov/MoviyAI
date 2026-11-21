import { chatWithGemma } from '../ai/services/gemma.service.js';
import { findMovieFromImages } from '../ai/services/image-movie.service.js';
import { findMovieFromVideo } from '../ai/services/video-movie.service.js';
import { findMovieFromText, isNamedMovieSearch } from '../ai/services/text-movie.service.js';
import { recommendMovies, isMovieRecommendation, type MovieRecommendation } from '../ai/services/movie-recommendation.service.js';
import { movieFollowup, isContextMovieFollowup } from '../ai/services/movie-followup.service.js';
import { findUzbekMovieLinks, isUzbekMovieRequest, uzbekLookupReply, uzbekReleaseTitle } from '../ai/services/uzbek-movie.service.js';
import { findCharacterImages, type CharacterImage } from '../ai/services/character-image.service.js';
import type { AiHistoryMessage, AiResult } from '../ai/types/ai.types.js';
import type { ChatImageUrl, MovieSearchResult } from '../ai/types/movie-search.types.js';
import type { ChatProgress } from '../ai/types/chat-progress.types.js';

export type BotResult = AiResult & { searchIdentified?: boolean; rich?: boolean; telegramSources?: Array<{ title: string; url: string }>; movie?: MovieSearchResult; recommendations?: MovieRecommendation[]; characterImages?: CharacterImage[] };
export async function answerBot(text: string, media: ChatImageUrl[], history: AiHistoryMessage[], previousMovie?: MovieSearchResult, onProgress?: ChatProgress): Promise<BotResult> {
  let result: BotResult;
  const sourcesOnly = /(?:manba|sources?|источник)/iu.test(text) && !media.length;
  if (media[0]?.mimeType.startsWith('video/')) result = { ...await findMovieFromVideo(text, media, undefined, onProgress), searchIdentified: true };
  else if (media.length) result = { ...await findMovieFromImages(text, media, undefined, undefined, undefined, onProgress), searchIdentified: true };
  else if (sourcesOnly && previousMovie?.sources.length) result = { text: 'Manbalar:', model: 'bot-sources', telegramSources: previousMovie.sources };
  else if (previousMovie && isContextMovieFollowup(text, previousMovie)) result = await movieFollowup(text, previousMovie);
  else if (isMovieRecommendation(text)) result = await recommendMovies(text, history);
  else if (isNamedMovieSearch(text, history)) result = { ...await findMovieFromText(text, undefined, undefined, history), searchIdentified: true };
  else if (previousMovie && isUzbekMovieRequest(text)) {
    const links = await findUzbekMovieLinks(previousMovie);
    result = { text: uzbekLookupReply(text, links.length > 0), model: 'uzbek-movie-search', movie: { ...previousMovie, titleUz: uzbekReleaseTitle(links) ?? previousMovie.titleUz, uzbekLinks: links, linksOnly: true } };
  } else {
    // Match the web/native streaming transport. Collect the completed answer
    // server-side; Telegram receives no partial messages or token-by-token edits.
    result = await chatWithGemma({ text, history }, () => {});
  }
  result.characterImages = result.movie && !result.movie.linksOnly && !['brief', 'trailer', 'details'].includes(result.movie.presentation ?? '')
    ? await findCharacterImages(result.text, result.movie).catch(() => []) : [];
  if (result.recommendations) await Promise.all(result.recommendations.map(async item => {
    item.characterImages = await findCharacterImages(item.text, item.movie).catch(() => []);
  }));
  if (sourcesOnly && result.movie?.sources.length) result.telegramSources = result.movie.sources;
  else if (/(?:aktyor|aktor|actor|cast|qahramon|character|акт[её]р|персонаж|геро)/iu.test(text)) result.rich = true;
  onProgress?.('preparing');
  return result;
}
