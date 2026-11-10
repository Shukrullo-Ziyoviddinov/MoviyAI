import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMovieFields} from '../dist/utils/movie-fields.js';
test('blank admin numeric and text fields remain null instead of turning into zero',()=>{
 const movie=parseMovieFields({title:{uz:'Known film',ru:''},ratingImdb:'',ratingKinopoisk:null,description:{uz:{text:'',year:'',duration:''}},specs:{year:'',duration:'',ageRating:''}});
 assert.equal(movie.ratingImdb,null);assert.equal(movie.ratingKinopoisk,null);assert.equal(movie.title.ru,null);assert.equal(movie.specs.year,null);assert.equal(movie.description.uz.year,null);assert.equal(movie.specs.duration,null);assert.equal(movie.description.ru.director,null);assert.equal(movie.trailers,null);
});
test('known numeric values including explicit zero ratings are preserved and consistency is checked',()=>{
 const movie=parseMovieFields({title:{uz:'Film'},ratingImdb:'0',ratingKinopoisk:'7.4',specs:{year:'2020',duration:'100'}});
 assert.equal(movie.ratingImdb,0);assert.equal(movie.ratingKinopoisk,7.4);assert.equal(movie.description.uz.year,2020);assert.equal(movie.description.ru.duration,100);
 for(const patch of [{ratingImdb:'bad'},{ratingKinopoisk:11},{specs:{duration:'0'}},{categoryName:'invented-category'},{description:{uz:{year:2020}},specs:{year:2010}}])assert.throws(()=>parseMovieFields({title:{uz:'Film'},...patch}));
});
test('an existing original identity allows editing missing locale names while new unnamed movies are rejected',()=>{
 assert.equal(parseMovieFields({title:{uz:null,ru:null}},true).title.uz,null);
 assert.throws(()=>parseMovieFields({title:{uz:null,ru:null}}),/TITLE_REQUIRED/);
});
