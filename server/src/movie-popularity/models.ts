import { Schema, model } from 'mongoose';

const event = new Schema({
  _id: { type: String, required: true },
  identity: { type: Schema.Types.Mixed, required: true },
  catalogId: { type: Number, default: null },
  movieId: { type: Number, default: null },
  occurredAt: { type: Date, required: true },
  nextAttemptAt: { type: Date, default: Date.now },
  attempts: { type: Number, default: 0 },
}, { collection: 'movie_search_events', timestamps: true });
event.index({ movieId: 1, nextAttemptAt: 1 });
export const MovieSearchEvent = model('MovieSearchEvent', event);

const total = new Schema({ _id: { type: Number, required: true }, count: { type: Number, required: true, default: 0 } },
  { collection: 'movie_search_totals', timestamps: true });
total.index({ count: -1, _id: 1 });
export const MovieSearchTotal = model('MovieSearchTotal', total);
