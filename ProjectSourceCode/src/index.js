// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');

// -------------------------------------  APP CONFIG   ----------------------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
// set Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};
const db = pgp(dbConfig);

// db test
db.connect()
  .then(obj => {
    // Can check the server version here (pg-promise v10.1.0+):
    console.log('Database connection successful');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR', error.message || error);
  });
//-------------------------------------  ROUTES for register.hbs   ----------------------------------------------

app.get('/register', (req, res) => {
  res.render('pages/register');
})

app.post('/register', async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  db.none('INSERT INTO users(username, password) VALUES($1, $2)', [req.body.username, hash])
      .then(() => {
          console.log("Registered User")
          res.redirect('login');
      })
      .catch(error => {
          res.render('pages/register', { message: 'Error Registering User' });
      });
})


// -------------------------------------  ROUTES for login.hbs   ----------------------------------------------
const user = {
  username: undefined,
  password: undefined,
  datetime_created: undefined,
};

//-------------------------------------  DEFAULT ROUTE   ----------------------------------------------

app.get('/', (req, res) => {
  res.redirect('/register'); //this will call the /anotherRoute route in the API
});

//-------------------------------------  DEFAULT ROUTE   ----------------------------------------------




app.get('/login', (req, res) => {
  res.render('pages/login');
});







// -------------------------------------  TEST ROUTE ----------------------------------------------

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// -------------------------------------  TEST ROUTE ----------------------------------------------



// Authentication middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

app.use(auth);

// -------------------------------------  ROUTES ----------------------------------------------



// -------------------------------------  ROUTES ----------------------------------------------



// -------------------------------------  ROUTES for logout.hbs   ----------------------------------------------

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});

// -------------------------------------  START THE SERVER   ----------------------------------------------

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');