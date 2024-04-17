// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt'); //  To hash passwords


// Define the directory where your static files are located


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
const publicDirectoryPath = path.join(__dirname, 'src', 'resources');
app.use(express.static(publicDirectoryPath));
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
// Register


app.post('/register', async (req, res) => {
  const { username, password, dob } = req.body;

  // Check if username, password, or dob is empty
  if (!username || !password || !dob) {
    return res.status(302).render('pages/register', { message: 'Username, password, and date of birth are required.' });
  }

  // Check if dob is in the correct format (YYYY-MM-DD)
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dobRegex.test(dob)) {
    return res.status(302).render('pages/register', { message: 'Date of birth must be in the format YYYY-MM-DD.' });
  }

  //hash the password using bcrypt library

    try {
          const hash = await bcrypt.hash(req.body.password, 10);
          await db.none('INSERT INTO users (username, password, dob) VALUES ($1, $2, $3)', [req.body.username, hash, req.body.dob]);
          console.log("Registered User")
          res.redirect(400, '/login');
        }
    catch(err){
      console.error('Error registering user:', err);
      //redirect if registration fails
      res.status(302).render('pages/register', { message: 'Error Registering User' });
    }
});
  const user = {
    username: undefined,
    password: undefined,
    datetime_created: undefined,
  };

  //-------------------------------------  DEFAULT ROUTE   ----------------------------------------------

  app.get('/', (req, res) => {
    res.redirect('/register'); //this will call the /anotherRoute route in the API
  });



app.get('/login', (req, res) => {
  console.log('openening login page')
  res.render('pages/login');
});
//-------------------------------------  LOGIN ----------------------------------------------

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Query to find user by username
  const query = 'SELECT * FROM users WHERE username = $1 LIMIT 1';
  const values = [username];

  try {
      // Retrieve user from the database
      const user = await db.oneOrNone(query, values);

      if (!user) {
          // User not found, render login page with error message
          return res.redirect('/register');
      }

      // Compare password
      const passwordMatch = await bcrypt.compare(req.body.password, user.password);

      if (!passwordMatch) {
          // Incorrect password, render login page with error message
          return res.render('pages/login', { message: 'Incorrect password' });
      }

      // Save user in session
      req.session.user = user;
      req.session.save();

      // Redirect to home page
      res.redirect('/home');
  } catch (err) {
      // Error occurred, redirect to login page
      console.log(err);
      res.redirect('/register');
  }
});

// -------------------------------------  ROUTES for home.hbs   ----------------------------------------------
app.get('/home' , async (req, res) => {
// ALWAYS CHECK IF THE USER IS LOGGED IN OR THERE IS NO DATA TO DISPLAY! IT WILL CRASH
  if (!req.session.user) {
    // Redirect to login page
    return res.redirect('/login');
  }

  const username = req.session.user.username;

  // get the statistics for the user
  const all_time_profit = (await db.one('SELECT SUM(profit) FROM bets WHERE username = $1', [req.session.user.username])).sum;
  const all_time_bets = (await db.one('SELECT COUNT(*) FROM bets WHERE username = $1', [req.session.user.username])).count;
  const monthly_profit = (await db.one('SELECT SUM(profit) FROM bets WHERE username = $1 AND datetime > NOW() - INTERVAL \'30 days\'', [req.session.user.username])).sum;
  const monthly_bets = (await db.one('SELECT COUNT(*) FROM bets WHERE username = $1 AND datetime > NOW() - INTERVAL \'30 days\'', [req.session.user.username])).count;

  const top_sports = await db.any('SELECT sport_name, SUM(profit) as total_profit FROM bets JOIN sports ON bets.sport_id = sports.sport_id WHERE username = $1 GROUP BY sport_name ORDER BY total_profit DESC LIMIT 3', [req.session.user.username]);
  const win_rate = ((await db.one('SELECT COUNT(*) FROM bets WHERE username = $1 AND profit > 0', [req.session.user.username])).count / all_time_bets)*100;

  res.render('pages/home', { username,all_time_profit, all_time_bets, monthly_profit, monthly_bets, top_sports, win_rate });
});
// -------------------------------------  ROUTE FOR ABOUT ----------------------------------------------

app.use('/resource/', express.static(path.join(__dirname, 'resource')));

app.get('/about', (req, res) => {
  console.log('Opening about page')
  res.render('pages/about', { images: ['/img/yurifung.jpg','/resource/img/yurifung.jpg','../../resource/img/yurifung.jpg']});
});
// ---------------------------------- NFL ---------------------------------------------------------------------

app.get('/nfl' , async (req, res) => {

  res.render('pages/Sports/nfl');
});

// app.get('/nfl' , async (req, res) => {
  // if (!req.session.user) {
  //   // Redirect to login page
  //   return res.redirect('/login');
  // }

//   var axios = require('axios');
  
//   var config = {
//     method: 'GET',
//     url: 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=8783121f863fdbb3b54fcadfb710bf9e',
//     headers: {
//       'X-RapidAPI-Key': '8783121f863fdbb3b54fcadfb710bf9e',
//       'X-RapidAPI-Host': 'sports-betting-odds.p.rapidapi.com'
//     },
//     params: {
//       "oddsFormat": "american",
//       "markets": "h2h,spreads,totals",
//       "regions": "us",
//       "apikey": "8783121f863fdbb3b54fcadfb710bf9e",
//       "sports": "upcoming",
//     }
//   };
//   axios(config)
//   .then(function (response) {
//     console.log(JSON.stringify(response.data));
//     res.render('pages/Sports/nfl', {events: response.data.slice(0, 15)});
//   })
//   .catch(function (error) {
//     console.log(error);
//   });
// });

// ------------------------------------------------------------------------------------------------------------



// ---------------------------------- UFC ---------------------------------------------------------------------

app.get('/ufc' , async (req, res) => {
  res.render('pages/Sports/ufc');

});


// app.get('/ufc' , async (req, res) => {

// if (!req.session.user) {
//   // Redirect to login page
//   return res.redirect('/login');
// }

//   var axios = require('axios');
  
//   var config = {
//     method: 'GET',
//     url: 'https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds?regions=us&markets=h2h&oddsFormat=american&apiKey=8783121f863fdbb3b54fcadfb710bf9e&sports=upcoming',
//     headers: {
//       'X-RapidAPI-Key': '8783121f863fdbb3b54fcadfb710bf9e',
//       'X-RapidAPI-Host': 'sports-betting-odds.p.rapidapi.com'
//     },
//     params: {
//       "oddsFormat": "american",
//       "markets": "h2h",
//       "apikey": "8783121f863fdbb3b54fcadfb710bf9e",
//       "sports": "upcoming",
//     }
//   };
//   axios(config)
//   .then(function (response) {
//     // console.log(JSON.stringify(response.data));
//     res.render('pages/Sports/ufc', {events: response.data.slice(0, 15)});
//   })
//   .catch(function (error) {
//     console.log(error);
//   });
// });

// -----------------------------------------------------------------------------------------------------------

// -----------------------------------------------NBA---------------------------------------------------------

app.get('/nba' , async (req, res) => {
    res.render('pages/Sports/nba');
});


// app.get('/nba' , async (req, res) => {

  // if (!req.session.user) {
  //   // Redirect to login page
  //   return res.redirect('/login');
  // }

//   var axios = require('axios');
  
//   var config = {
//     method: 'GET',
//     url: 'https://api.the-odds-api.com/v4/sports/basketball_nba/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=8783121f863fdbb3b54fcadfb710bf9e',
//     headers: {
//       'X-RapidAPI-Key': '8783121f863fdbb3b54fcadfb710bf9e',
//       'X-RapidAPI-Host': 'sports-betting-odds.p.rapidapi.com'
//     },
//     params: {
//       "oddsFormat": "american",
//       "markets": "h2h,spreads,totals",
//       "apikey": "8783121f863fdbb3b54fcadfb710bf9e",
//       "sports": "upcoming",
//     }
//   };
//   axios(config)
//   .then(function (response) {
//     // console.log(JSON.stringify(response.data));
//     res.render('pages/Sports/nba', {events: response.data.slice(0, 15)});
//   })
//   .catch(function (error) {
//     console.log(error);
//   });
// });

// -----------------------------------------------------------------------------------------------------------






// -------------------------------------  ROUTES for bets.hbs   ----------------------------------------------
app.get('/bets', async (req, res) => {

  // ALWAYS CHECK IF THE USER IS LOGGED IN OR THERE IS NO DATA TO DISPLAY! IT WILL CRASH
  if (!req.session.user) {
    // Redirect to login page
    return res.redirect('/login');
  }


  const sports = (await db.any('SELECT sport_name FROM sports')).map(sport => sport.sport_name);

  const brokers = (await db.any('SELECT broker_name FROM brokers')).map(broker => broker.broker_name);

  const bets = await db.any(`SELECT datetime, sport_name, broker_name, stake, odds, profit
    FROM bets join sports on bets.sport_id = sports.sport_id join brokers on bets.broker_id = brokers.broker_id
    WHERE username = $1`, [req.session.user.username]);


  res.render('pages/bets', { sports, brokers, bets });
});


app.post('/bets', async (req, res) => {
  const { event, broker, amount, odds_sign, odds, outcome } = req.body;
  // get the + or - sign from the team name and convert to integer
  const odds_sign_int = odds_sign === '+' ? 1 : -1;
  // if won, profit = stake * odds, if lost, profit = -stake
  if (outcome === 'won') {
    // calculate the profit (odds are in American Moneyline format)
    if (odds_sign_int === 1) {
      profit = amount * (odds / 100);
    }
    else {
      profit = amount * (100 / odds);
    }
  } else {
    profit = -amount;
  }
  const username = req.session.user.username;
  const datetime = new Date().toISOString();
  const sport_id = await db.one('SELECT sport_id FROM sports WHERE sport_name = $1', [event]);
  const broker_id = await db.one('SELECT broker_id FROM brokers WHERE broker_name = $1', [broker]);
  await db.none('INSERT INTO bets (sport_id, broker_id, username, stake, datetime, odds, profit) VALUES ($1, $2, $3, $4, $5, $6, $7)', [sport_id.sport_id, broker_id.broker_id, username, amount, datetime, odds*odds_sign_int, profit]);
  res.redirect('/bets');
});

app.get('/api/sport-images', async (req, res) => {
  const sportName = req.query.name;

  try {
    const sport = await db.one('SELECT sport_image FROM sports WHERE sport_name = $1', [sportName]);
    res.json({ imageUrl: sport.sport_image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the sport image.' });
  }
});

// Handelbars helpers
// function to format the date in handelbars
hbs.handlebars.registerHelper('formatDate', function(datetime) {
  const date = new Date(datetime);
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  return date.toLocaleDateString('en-US', dateOptions) + ' ' + date.toLocaleTimeString('en-US', timeOptions);
});
// function to format the odds in handelbars
hbs.handlebars.registerHelper('formatOdds', function(odds) {
  return odds >= 0 ? `+${odds}` : `${odds}`;
});

// function to format the profit in handelbars
hbs.handlebars.registerHelper('rowClass', function(profit) {
  return profit > 0 ? 'won' : 'lost';
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








// -------------------------------------  ROUTE for logout.hbs   ----------------------------------------------

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});


// -------------------------------------  START THE SERVER   ----------------------------------------------

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');