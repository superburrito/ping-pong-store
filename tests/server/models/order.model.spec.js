var sinon = require('sinon');
var expect = require('chai').expect;

var Sequelize = require('sequelize');

var db = require('../../../server/db');

var User = db.model('user');

describe('Order model', function () {

    var newUser,newOrder;
    beforeEach('Sync DB', function () {
        return User.create({
            firstName: "John",
            lastName: "Henry",
            email: "johnhenry@gmail.com",
            password: "123guessme",
            address: "5th Hanover Square",
            isAdmin: true
        }).then(function(user){
            newUser = user;
        }).then(function(){
            var order = {
            	status: 1,
            	address: 'wall street'
            }
            return newUser.createOrder(order)
        }).then(function(order){
            newOrder = order;
        }).then(function(){
            return db.sync({ force: true });
        });
    })

    describe('make an order', function () {
        describe('user exist', function () {
            it('should exist', function () {
                expect(newUser.email).to.exist;
            })
        });
        describe('order is associate to user', function () {
        	var address = 'wall street';
            it('should exist', function () {
        		expect(newOrder.address).to.be.equal(address);
        		expect(newOrder.userId).to.be.equal(newUser.id);
            })
        });
    });

});
