// Instantiate all models
var expect = require('chai').expect;

var Sequelize = require('sequelize');

var db = require('../../../server/db');

var supertest = require('supertest');

describe('Users Route', function () {

    var app, User;

    beforeEach('Sync DB', function () {
        return db.sync({ force: true });
    });

    beforeEach('Create app', function () {
        app = require('../../../server/app')(db);
        User = db.model('user');
    });

	describe('Unauthenticated request', function () {

		var guestAgent;

		beforeEach('Create guest agent', function (done) {
			User.create({firstName:'paul', lastName: 'hsu', email: 'testing@fsa.com',
			password: 'paul', address: '75 Wall St', isAdmin:false
			})
			.then(function(newUser){
				if(newUser.id == 1) console.log("User Paul created");
				guestAgent = supertest.agent(app);
				guestAgent.post('/login')
									.send({email: 'testing@fsa.com',password: 'paul'})
									.end(done);
			})
		});

		it('should get a 403 response', function (done) {
			console.log("Non-admin is trying to access users")
			guestAgent.get('/api/users/')
				.expect(403)
				.end(function(err,response){
					if(err) return done(err);
					console.log("Response status is: ", response.status);
					done();
				})
		});

	});

/*	describe('Authenticated request', function () {

		var loggedInAgent;

		var userInfo = {
			email: 'joe@gmail.com',
			password: 'shoopdawoop'
		};

		beforeEach('Create a user', function (done) {
			return User.create(userInfo).then(function (user) {
                done();
            }).catch(done);
		});

		beforeEach('Create loggedIn user agent and authenticate', function (done) {
			loggedInAgent = supertest.agent(app);
			loggedInAgent.post('/login').send(userInfo).end(done);
		});

		it('should get with 200 response and with an array as the body', function (done) {
			loggedInAgent.get('/api/members/secret-stash').expect(200).end(function (err, response) {
				if (err) return done(err);
				expect(response.body).to.be.an('array');
				done();
			});
		});

	});*/

});
