export const CATALOG_CATEGORIES = ['actionMovies', 'horrorMovies', 'animationMovies', 'romanceMovies', 'dramaMovies', 'comedyMovies', 'familyMovies', 'sciFiMovies'] as const;

// Aliases identify a concept; the stored value must still be read from MongoDB.
// These lists never create dictionary rows or provide substitute output values.
export const GENRE_ALIASES: Record<string, readonly string[]> = {
  animation: ['animation', 'animated', 'animatsiya', 'анимация', 'мультфильм'],
  drama: ['drama', 'dramma', 'драма'],
  scienceFiction: ['science fiction', 'sci-fi', 'sci fi', 'scifi', 'ilmiy fantastika', 'fantastika', 'фантастика', 'научная фантастика'],
  fantasy: ['fantasy', 'fantaziya', 'fentezi', 'фэнтези'],
  action: ['action', 'jangari', 'боевик'],
  comedy: ['comedy', 'komediya', 'комедия'],
  romance: ['romance', 'romantic', 'melodrama', 'мелодрама', 'романтика'],
  family: ['family', 'oilaviy', 'семейный', 'семейное'],
  horror: ['horror', 'qo‘rqinchli', 'qorqinchli', 'ужасы'],
  adventure: ['adventure', 'sarguzasht', 'приключения'],
  sport: ['sport', 'sports', 'спорт'],
  history: ['history', 'historical', 'tarixiy', 'история', 'исторический'],
  thriller: ['thriller', 'triller', 'триллер'],
  crime: ['crime', 'criminal', 'kriminal', 'криминал'],
  biography: ['biography', 'biographical', 'biografiya', 'биография'],
  mystery: ['mystery', 'sirli', 'тайна'],
  detective: ['detective', 'detektiv', 'детектив'],
  documentary: ['documentary', 'hujjatli', 'документальный'],
};

export const COUNTRY_ALIASES: Record<string, readonly string[]> = {
  usa: ['USA', 'US', 'U.S.A.', 'U.S.', 'United States', 'United States of America', 'AQSh', 'AQSH', 'Amerika Qo‘shma Shtatlari', 'США', 'Соединённые Штаты Америки'],
  india: ['India', 'IN', 'IND', 'Hindiston', 'Индия'],
  uk: ['UK', 'U.K.', 'GB', 'GBR', 'United Kingdom', 'Great Britain', 'Buyuk Britaniya', 'Великобритания', 'Соединённое Королевство'],
  france: ['France', 'FR', 'FRA', 'Fransiya', 'Франция'],
  germany: ['Germany', 'DE', 'DEU', 'Germaniya', 'Германия'],
  italy: ['Italy', 'IT', 'ITA', 'Italiya', 'Италия'],
  spain: ['Spain', 'ES', 'ESP', 'Ispaniya', 'Испания'],
  japan: ['Japan', 'JP', 'JPN', 'Yaponiya', 'Япония'],
  southKorea: ['South Korea', 'Republic of Korea', 'KR', 'KOR', 'Janubiy Koreya', 'Южная Корея', 'Республика Корея'],
  northKorea: ['North Korea', 'KP', 'PRK', 'Shimoliy Koreya', 'Северная Корея', 'КНДР'],
  china: ['China', 'CN', 'CHN', 'Xitoy', 'Китай'],
  hongKong: ['Hong Kong', 'HK', 'HKG', 'Gonkong', 'Гонконг'],
  taiwan: ['Taiwan', 'TW', 'TWN', 'Tayvan', 'Тайвань'],
  russia: ['Russia', 'Russian Federation', 'RU', 'RUS', 'Rossiya', 'Россия', 'Российская Федерация'],
  sovietUnion: ['Soviet Union', 'USSR', 'SSSR', 'Sovet Ittifoqi', 'СССР', 'Советский Союз'],
  canada: ['Canada', 'CA', 'CAN', 'Kanada', 'Канада'],
  australia: ['Australia', 'AU', 'AUS', 'Avstraliya', 'Австралия'],
  turkey: ['Turkey', 'Türkiye', 'TR', 'TUR', 'Turkiya', 'Турция'],
  uzbekistan: ['Uzbekistan', 'UZ', 'UZB', 'O‘zbekiston', 'Узбекистан', 'Ўзбекистон'],
  brazil: ['Brazil', 'BR', 'BRA', 'Braziliya', 'Бразилия'],
  mexico: ['Mexico', 'MX', 'MEX', 'Meksika', 'Мексика'],
  iran: ['Iran', 'IR', 'IRN', 'Eron', 'Иран'],
};

// Editorial precedence for films with several supported genres, most distinctive first.
// Never infer an age restriction, target audience or a broad default category.
export const CATEGORY_RULES: ReadonlyArray<{ genre: string; category: typeof CATALOG_CATEGORIES[number] }> = [
  { genre: 'animation', category: 'animationMovies' },
  { genre: 'horror', category: 'horrorMovies' },
  { genre: 'scienceFiction', category: 'sciFiMovies' },
  { genre: 'action', category: 'actionMovies' },
  { genre: 'romance', category: 'romanceMovies' },
  { genre: 'comedy', category: 'comedyMovies' },
  { genre: 'family', category: 'familyMovies' },
  { genre: 'drama', category: 'dramaMovies' },
];
