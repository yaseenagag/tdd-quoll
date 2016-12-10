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

const BOOKS_QUERY =
  `SELECT books.*,
    (SELECT authors.name FROM authors, book_authors WHERE book_authors.book_id=books.id AND book_authors.author_id=authors.id LIMIT 1) AS author,
    array(SELECT genres.name FROM genres, book_genres WHERE book_genres.book_id=books.id AND book_genres.genre_id=genres.id ORDER BY genres.name ASC) AS genres
  FROM books`

const getBooks = ({page, title, author, year}) => {
  page = parseInt( page || 1 )
  const offset = ( page - 1 ) * 10

  let params = [ offset ]
  let index = 1
  let clauses = []

  if( title !== undefined ) {
    clauses.push( `books.title ILIKE '%\$${++index}^%' ` )
    params.push( title )

  }

  if( author !== undefined ) {
    clauses.push( `(SELECT authors.name FROM authors, book_authors WHERE book_authors.book_id=books.id AND book_authors.author_id=authors.id LIMIT 1)  ILIKE '%\$${++index}^%' ` )
    params.push( author )
  }

  if( year !== undefined ) {
    clauses.push( `books.year=\$${++index} ` )
    params.push( year )
  }


  query = `${BOOKS_QUERY} ${clauses.length > 0 ? `WHERE ${clauses.join( ' AND ' )}` : ''} LIMIT 10 OFFSET $1`

  return pgpdb.query( query, params )

  // title = `%${title.toLowerCase()}%`
  // console.log(title)
  // return pgpdb.query(`
  //   select books.*
  //   from books
  //   where
  //     LOWER(books.title) like $2
  //   limit 10 offset $1
  //   `, [offset,title])
}

const getAuthors = ({page, author}) => {
  page = parseInt( page || 1 )
  const offset = ( page - 1 ) * 10
  return pgpdb.query(`SELECT authors.name, authors.id FROM authors LIMIT 10 OFFSET $1`, [offset])
  }

const searchByAuthor = id => {
  return pgpdb.query(`
  SELECT DISTINCT books.*
  FROM books
  LEFT JOIN book_authors
  ON books.id=book_authors.book_id
  LEFT JOIN authors
  ON authors.id=book_authors.author_id
  LEFT JOIN book_genres
  ON books.id=book_genres.book_id
  LEFT JOIN genres
  ON genres.id=book_genres.genre_id
  WHERE authors.id=$1
  `)
}
const searchByTitle = id => {
  return pgpdb.query(`
    SELECT *
    FROM books
    WHERE books.title Like '%\${title^}%'
  `)
}


module.exports = { resetDb, createWholeBook, getBooks, searchByAuthor, searchByTitle, getAuthors }
