export type MovieSource = { title: string; url: string; snippet?: string;pageFacts?:{title:string;year:number|null;countries:string[]};structuredHtml?:string };
export type MovieFact<T> = { value: T | null; sources: MovieSource[] };
export interface MovieDetails {
  productionYears: MovieFact<string>; countries: MovieFact<string[]>; genres: MovieFact<string[]>;
  runtimeMinutes: MovieFact<number>; ageRating: MovieFact<string> & {country?:string;system?:string}; synopsis: MovieFact<string>;
  directors: MovieFact<string[]>; budget: MovieFact<string>; boxOffice: MovieFact<string>;
  writers: MovieFact<string[]>; premiere: MovieFact<string>;
  imdb: MovieFact<number>; kinopoisk: MovieFact<number>;
  cast: Array<{ name: string; originalName?: string; role: string | null; sources: MovieSource[] }>;
  characters?: Array<{ name: string; originalName: string; description: string | null; sources: MovieSource[] }>;
  checkedAt: string;
}
