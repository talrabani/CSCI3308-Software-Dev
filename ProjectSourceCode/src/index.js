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
    return res.status(406).render('pages/register', { message: 'Username, password, and date of birth are required.' });
  }

  // Check if dob is in the correct format (YYYY-MM-DD)
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dobRegex.test(dob)) {
    return res.status(406).render('pages/register', { message: 'Date of birth must be in the format YYYY-MM-DD.' });
  }

  //hash the password using bcrypt library

    try {
          const hash = await bcrypt.hash(req.body.password, 10);
          await db.none('INSERT INTO users (username, password, dob) VALUES ($1, $2, $3)', [req.body.username, hash, req.body.dob]);
          console.log("Registered User")
            res.status(200).redirect('/login');
        }
    catch(err){
      console.error('Error registering user:', err);
      //redirect if registration fails
      res.status(406).render('pages/register', { message: 'Error Registering User' });
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

  const top_sports = await db.oneOrNone('SELECT sport_name, SUM(profit) as total_profit FROM bets JOIN sports ON bets.sport_id = sports.sport_id WHERE username = $1 GROUP BY sport_name ORDER BY total_profit DESC LIMIT 1', [req.session.user.username]);
  const win_rate = ((await db.one('SELECT COUNT(*) FROM bets WHERE username = $1 AND profit > 0', [req.session.user.username])).count / all_time_bets)*100;

  res.render('pages/home', { username,all_time_profit, all_time_bets, monthly_profit, monthly_bets, top_sports, win_rate });
});
// -------------------------------------  ROUTE FOR ABOUT ----------------------------------------------

// app.use('/resource/', express.static(path.join(__dirname, 'resource')));

// app.get('/about', (req, res) => {
//   console.log('Opening about page')
//   res.render('pages/about', { images: ['/img/yurifung.jpg','/resource/img/yurifung.jpg','../../resource/img/yurifung.jpg']});
// });



// Serve static files from the 'resource' directory
app.use("/resources",express.static(path.join(__dirname, 'resource')));

// Define route for the '/about' page
app.get('/about', (req, res) => {
  console.log('Opening about page');
  // Pass an array of image paths to the Handlebars template
  // res.render('pages/about', {
  //   images: [
  //     '/img/rileymei.jpg',
  //     '/img/yurifung.jpg',
  //     // Add paths for other images if needed
  //   ]
  // });
    res.render('pages/about', { 
      images: [
        'https://media.licdn.com/dms/image/D5603AQHY4U2MmD35hg/profile-displayphoto-shrink_800_800/0/1711482138961?e=2147483647&v=beta&t=N43M7l9f3tsz_f-D7BE08vtRAKMGxPsaNZcNzxMp6CI',
        'https://media.licdn.com/dms/image/C5603AQEGTJvp_niqCQ/profile-displayphoto-shrink_200_200/0/1662247464003?e=2147483647&v=beta&t=bM8TTrQBytKJZi2N-wBdqLGo-m3GR1eAbfdqZc-iM_w',
        'https://media.licdn.com/dms/image/C4D03AQFzu7y9zhO29A/profile-displayphoto-shrink_200_200/0/1642311954305?e=2147483647&v=beta&t=ivd1fuGpZF9KU0BbIzmVa1S3lo2l8DyRzX94cACtvkg',
        'https://media.licdn.com/dms/image/D5603AQEPxrZWUqE5lw/profile-displayphoto-shrink_800_800/0/1670399431398?e=1719446400&v=beta&t=4m0Q_1dxA2ZxvKGqyZU6imu1rmrnn0lWuKqDKE7WPjk',
        'https://media.licdn.com/dms/image/D4E03AQHtTMFIgqcz4A/profile-displayphoto-shrink_200_200/0/1701419718076?e=2147483647&v=beta&t=0mG_Z5-DSD0_uija3-nhbnNjlr-12utPemPOJXkTZ0I',
] 
  });
});











// ---------------------------------- NFL ---------------------------------------------------------------------

// app.get('/nfl' , async (req, res) => {

//   res.render('pages/Sports/nfl');
// });

app.get('/nfl' , async (req, res) => {
  if (!req.session.user) {
    // Redirect to login page
    return res.redirect('/login');
  }

  var axios = require('axios');
  
  var config = {
    method: 'GET',
    url: 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=8783121f863fdbb3b54fcadfb710bf9e',
    headers: {
      'X-RapidAPI-Key': '8783121f863fdbb3b54fcadfb710bf9e',
      'X-RapidAPI-Host': 'sports-betting-odds.p.rapidapi.com'
    },
    params: {
      "oddsFormat": "american",
      "markets": "h2h,spreads,totals",
      "regions": "us",
      "apikey": "8783121f863fdbb3b54fcadfb710bf9e",
      "sports": "upcoming",
    }
  };
  axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
    res.render('pages/Sports/nfl', {events: response.data.slice(0, 15)});
  })
  .catch(function (error) {
    console.log(error);
  });
});

// ------------------------------------------------------------------------------------------------------------



// ---------------------------------- UFC ---------------------------------------------------------------------

// app.get('/ufc' , async (req, res) => {
//   res.render('pages/Sports/ufc');

// });


app.get('/ufc' , async (req, res) => {

if (!req.session.user) {
  // Redirect to login page
  return res.redirect('/login');
}

  var axios = require('axios');
  
  var config = {
    method: 'GET',
    url: 'https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds?regions=us&markets=h2h&oddsFormat=american&apiKey=8783121f863fdbb3b54fcadfb710bf9e&sports=upcoming',
    headers: {
      'X-RapidAPI-Key': '8783121f863fdbb3b54fcadfb710bf9e',
      'X-RapidAPI-Host': 'sports-betting-odds.p.rapidapi.com'
    },
    params: {
      "oddsFormat": "american",
      "markets": "h2h",
      "apikey": "8783121f863fdbb3b54fcadfb710bf9e",
      "sports": "upcoming",
    }
  };
  axios(config)
  .then(function (response) {
    // console.log(JSON.stringify(response.data));
    res.render('pages/Sports/ufc', {events: response.data.slice(0, 15)});
  })
  .catch(function (error) {
    console.log(error);
  });
});

// -----------------------------------------------------------------------------------------------------------

// -----------------------------------------------NBA---------------------------------------------------------

// app.get('/nba' , async (req, res) => {
//     res.render('pages/Sports/nba');
// });


app.get('/nba' , async (req, res) => {

  if (!req.session.user) {
    // Redirect to login page
    return res.redirect('/login');
  }

  var axios = require('axios');
  
  var config = {
    method: 'GET',
    url: 'https://api.the-odds-api.com/v4/sports/basketball_nba/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=8783121f863fdbb3b54fcadfb710bf9e',
    headers: {
      'X-RapidAPI-Key': '8783121f863fdbb3b54fcadfb710bf9e',
      'X-RapidAPI-Host': 'sports-betting-odds.p.rapidapi.com'
    },
    params: {
      "oddsFormat": "american",
      "markets": "h2h,spreads,totals",
      "apikey": "8783121f863fdbb3b54fcadfb710bf9e",
      "sports": "upcoming",
    }
  };
  axios(config)
  .then(function (response) {
    // console.log(JSON.stringify(response.data));
    res.render('pages/Sports/nba', {events: response.data.slice(0, 15)});
  })
  .catch(function (error) {
    console.log(error);
  });
});

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

hbs.handlebars.registerHelper('gt', function(a, b, options) {
  if (a > b) {
    return options.fn(this);
  }
  return options.inverse(this);
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

// -------------------------------------  ROUTE for community.hbs   ----------------------------------------------

app.get('/community', async (req, res) => {
  if (!req.session.user) {
      return res.redirect('/login');
  }

  const username = req.session.user.username;
  const FootballMessages = await db.query('SELECT username, message, timestamp FROM user_chats WHERE forum = $1', ['football-chat']);
  const BasketballMessages = await db.query('SELECT username, message, timestamp FROM user_chats WHERE forum = $1', ['basketball-chat']);
  const UFCMessages = await db.query('SELECT username, message, timestamp FROM user_chats WHERE forum = $1', ['ufc-chat']);

  FootballMessages.forEach(message => {
    message.prettyTime = formatTime(message.timestamp);
  });
  BasketballMessages.forEach(message => {
    message.prettyTime = formatTime(message.timestamp);
  });
  UFCMessages.forEach(message => {
    message.prettyTime = formatTime(message.timestamp);
  });
  

  res.render('pages/community', {FootballMessages, BasketballMessages, UFCMessages, username });
});



function formatTime(timestamp) {
  // Create a new Date object from the timestamp
  const date = new Date(timestamp);

  // Convert the timestamp to Mountain Time
  date.setHours(date.getHours() - 6);

  // Get hours, minutes, and seconds from the date object
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Determine AM or PM
  const period = hours < 12 ? 'AM' : 'PM';

  // Convert hours from 24-hour to 12-hour format
  const hours12 = hours % 12 || 12; // Handle midnight (0) as 12

  // Pad minutes with leading zeros if needed
  const paddedMinutes = minutes < 10 ? '0' + minutes : minutes;

  // Construct the formatted time string
  const formattedTime = `${hours12}:${paddedMinutes} ${period}`;

  return formattedTime;
}

  // route to handle saving messages
app.post('/saveMessage', async (req, res) => {
  const { username, message, forum, timestamp } = req.body;

  try {
      // Insert message into database
      await db.query('INSERT INTO user_chats (username, message, forum, timestamp) VALUES ($1, $2, $3, $4)', [username, message, forum, timestamp]);
      res.sendStatus(200);
  } catch (error) {
      console.error('Error saving message:', error);
      res.sendStatus(500);
  }
});




// -------------------------------------  START THE SERVER   ----------------------------------------------

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');