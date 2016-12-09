const express = require('express')
const bodyParser = require('body-parser')
const db = require('../config/database.js')
const server = express()


server.set('port', process.env.PORT || '3000')

server.use(bodyParser.json())

server.get('/ping', (request, response, next) => {
  response.send('pong')
})

server.post('/api/test/reset-db', (request, response, next) => {
  db.resetDb().then(() => {
    response.status(200).end()
  })
})

server.post('/api/books', (request, response, next) => {
  if ( request.body.hasOwnProperty("title") ) {
    db.createWholeBook(request.body).then(book => {
      response.status(201).json(book).end
    })
  } else {
    response.status(400).json({
      error: {message: 'title cannot be blank'}
    })
  }
})

server.get('/api/books', (request, response, next) => {
  db.getBooks(request.query)
    .then((books) => {
      response.status(200).json(books)
    })
    .catch(error => {
      console.error(error)
      response.status(500).json({error})
    })
})

server.get('/api/books', (request, response, next) => {
  let page = ( parseInt (request.query.page)) || 1
  const id = request.params.id
  const {title} = request.query
  db.getBooks(page).then((books, page) =>
    response.status(200).json(books))
})

server.get( '/api/books/:id', ( request, response ) => {
  db.getBook( request.params.id )
    .then( book => response.json( book))
    .catch( error => response.status( 404 ).json() )
})

server.get( '/api/authors', ( request, response ) => {
  db.getAuthors( request.query )
    .then( result => response.json( result ))
})

server.get( '/api/genres', ( request, response ) => {
  db.getGenres( request.query )
    .then( result => response.json( result ))
})


if (process.env.NODE_ENV !== 'test'){
  server.listen(server.get('port'))
}

module.exports = server
