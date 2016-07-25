'use strict';
var db = require('./_db');
module.exports = db;

var User = require('./models/user');
var Product = require('./models/product');
var Order = require('./models/order');
var Review = require('./models/review');

//Relationships
User.hasMany(Order);
Order.hasOne(User);
Order.hasMany(Product);
Product.hasMany(Review);
Review.hasOne(Product);
User.hasMany(Review);
Review.hasOne(User);

