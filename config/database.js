const pgp = require( 'pg-promise' )()
const pgpdb = pgp({ database: 'quoll' })
const SQL = require( './sql_strings' )

const resetDb = () => {
  return Promise.all([
    pgpdb.query('delete from books'),
    pgpdb.query('delete from authors'),
    pgpdb.query('delete from genres'),
    pgpdb.query('delete from book_authors'),
    pgpdb.query('delete from book_genres'),
  ])
}

const deleteBook = () => {
  return pgpdb.query('delete from books where id = $1')
}

const createBook = (title, year) => {
  return pgpdb.query('insert into books( title, year ) values( $1, $2 ) returning id', [title, year])
    .then(result => result[0].id)
}

const createAuthor = author => {
  return pgpdb.query('insert into authors( name ) values( $1 ) returning id', [ author ])
    .then(result => result[0].id)
}

const createGenre = genre => {
  return pgpdb.query('insert into genres( name ) values( $1 ) returning id', [ genre ])
    .then(result => result[0].id)
}

const joinBookAuthor = (bookId, authorId) => {
  return pgpdb.query('insert into book_authors ( book_id, author_id ) values( $1, $2 )', [ bookId, authorId ])
}

const joinBookGenre = (bookId, genreId) => {
  return pgpdb.query('insert into book_genres ( book_id, genre_id ) values( $1, $2 )', [ bookId, genreId ])
}

const createWholeBook = book => {
    return Promise.all([
      createBook(book.title, book.year),
      createAuthor(book.author),
      Promise.all(
        book.genres.sort().map(genre => {
          return createGenre(genre)
        })
      )
    ]).then(results => {
      const bookId = results[0]
      const authorId = results[1]
      const genreIds = results[2]

      joinBookAuthor(bookId, authorId)

      genreIds.forEach(genreId => {
        joinBookGenre(bookId, genreId)
      })

      book.id = bookId

      return book
    })
}

const getBooks = (page = 1) => {
  const offset = (page-1) * 10
  return pgpdb.query(`
    select books.id,
      books.title,
      books.year,
      authors.name as author,
      json_agg(genres.name order by genres.name asc) as genres
    from books
      join book_genres on books.id = book_genres.book_id
      join genres on book_genres.genre_id = genres.id
      join book_authors on books.id = book_authors.book_id
      join authors on book_authors.book_id = authors.id
    group by books.id, title, year, author
    limit 10 offset $1
    `, [offset])
}

const getBook = id => {
  return pgpdb.query( `select books.*, ${SQL.GENRES_SUBQUERY} as genres, ${SQL.AUTHORS_SUBQUERY} as author from books where id=$1`, id )
}

module.exports = { resetDb, createWholeBook, getBooks, getBook }
