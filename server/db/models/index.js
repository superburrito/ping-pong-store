'use strict';

var db = require('../_db.js');
var User = require('./user.model.js');
var Product = require('./product.model.js');
var Order = require('./order.model.js');
var Review = require('./review.model.js');

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


