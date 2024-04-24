// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added
// const bcrypt = require('bcrypt');
// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

describe('Testing Add User API', () => {
  it('Positive : /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 'John Doe',  password: 'johndoe', email: 'johndoe@gmail.com', dob: '0001-01-01'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        // expect(res.body.message).to.equals('Success');
        done();
      });
  });
  it('Negative : /register. Checking Invalid Name/Password and DOB', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: '',  password: 'notapass', email: 'notemail@gmail.com', dob: '01-01-0001'})
      .end((err, res) => {
        expect(res).to.have.status(406);
        // expect(res.body.message).to.equals('Invalid input');
        done();
      });
  });
  // it('Negative : /register. Checking Invalid Mail', done => {
  //   chai
  //     .request(server)
  //     .post('/register')
  //     .send({username: 'John Doe',  password: 'johndoe', email: 'johndoegmail.com', dob: '0001-01-01'})
  //     .end((err, res) => {
  //       expect(res).to.have.status(406);
  //       // expect(res.body.message).to.equals('Invalid input');
  //       done();
  //     });
  // });
  
});
// describe('Testing Add User API', () => {
//   it('positive : /register', done => {
//     chai
//       .request(server)
//       .post('/register')
//       .send({username: 'John Doe',  password: 'johndoe', email: 'johndoe@gmail.com', dob: '01-01-0001'})
//       .end((err, res) => {
//         expect(res).to.have.status(302);
//         done();
//       });
//   });
// });
// describe('Testing Add User API', () => {
//   it('Negative : /register. Checking invalid name', done => {
//     chai
//       .request(server)
//       .post('/register')
//       .send({username: 'notuser',  password: 'notpassword', email: 'notemail@gmail.com', dob: '01-01-0001'})
//       .end((err, res) => {
//         expect(res).to.have.status(302);
//         done();
//       });
//   });
// });
describe('Testing Redirect', () => {
  // Sample test case given to test /test endpoint.
  it('\test route should redirect to /login with 302 HTTP status code', done => {
    chai
      .request(server)
      .get('/test')
      .end((err, res) => {
        res.should.have.status(200); // Expecting a redirect status code
        res.should.redirectTo(/^.*127\.0\.0\.1.*\/login$/); // Expecting a redirect to /login with the mentioned Regex
        done();
      });
  });
});

// create a cookies variable
var cookies;

describe('Login', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/login')
      .end((err, res) => {
        // expect statements
        cookies = res.headers['set-cookie'].pop().split(';')[0]; // save the cookies
        done();
      });
  });
});

describe('Home', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default logout message', done => {
    chai
      .request(server)
      .get('/logout')
      .set('cookie', cookies) // set the cookie in the request
      .end((err, res) => {
        // expect statements
        done();
      });
  });
});


// ********************************************************************************
const { Pool } = require('pg');

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: 'your_username',
  host: 'your_host',
  database: 'your_database',
  password: 'your_password',
  port: 5432, // Default PostgreSQL port
});

// Function to check if a message has been saved
async function checkMessageSaved(messageContent) {
  try {
    // Perform a SELECT query to retrieve the message
    const query = {
      text: 'SELECT * FROM user_chats WHERE message = $1',
      values: [messageContent],
    };
    const result = await pool.query(query);

    // Check if any rows are returned
    if (result.rows.length > 0) {
      console.log('Message saved successfully');
    } else {
      console.log('Message not found in the database');
    }
  } catch (error) {
    console.error('Error checking message:', error);
  }
}

// Call the function with the message content you want to check
checkMessageSaved('Your message content');
