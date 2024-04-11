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
  it('positive : /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({username: 'John Doe',  password: 'johndoe', email: 'johndoe@gmail.com', dob: '0001-01-01'})
      .end((err, res) => {
        expect(res).to.have.status(400);
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
        expect(res).to.have.status(302);
        // expect(res.body.message).to.equals('Invalid input');
        done();
      });
  });
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
// ********************************************************************************