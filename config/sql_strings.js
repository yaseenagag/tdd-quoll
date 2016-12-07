module.exports = {

  GENRES_SUBQUERY: 'ARRAY( SELECT genres.name FROM genres, book_genres WHERE books.id=book_genres.book_id AND genres.id=book_genres.genre_id ORDER BY genres.name )',

  AUTHORS_SUBQUERY: '( SELECT authors.name FROM authors, book_authors WHERE books.id=book_authors.book_id AND authors.id=book_authors.author_id )',

}
