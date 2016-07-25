'use strict';
var db = require('./_db');

var User = require('./models/user');
var Product = require('./models/product');
var Order = require('./models/order');
var Review = require('./models/review');

//Relationships
User.hasMany(Order);
Order.belongsToMany(Product, { through: 'orderproductpivot' });
Product.belongsToMany(Order, { through: 'orderproductpivot' });
Product.hasMany(Review);
User.hasMany(Review);


module.exports = {
	User: User,
	Product: Product,
	Order: Order,
	Review: Review
};


