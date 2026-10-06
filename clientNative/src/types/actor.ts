export type LocalizedPair = {
  uz: string;
  ru: string;
};

export type Actor = {
  id: number;
  actorName: string;
  actorImg: string;
  actorAbout: LocalizedPair;
  movies?: import('./movie').Movie[];
};
