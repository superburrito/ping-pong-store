'use strict';

var db = require('../_db.js');
var User = require('./user.model.js');
var Product = require('./product.model.js');
var Order = require('./order.model.js');
var Review = require('./review.model.js');
var Orderproduct = require('./orderproduct.model.js');

//Relationships
User.hasMany(Order);

Order.hasMany(Orderproduct);
Orderproduct.belongsTo(Order);

Product.hasMany(Orderproduct);
Orderproduct.belongsTo(Product);

Product.hasMany(Review);
User.hasMany(Review);


module.exports = {
	User: User,
	Orderproduct: Orderproduct,
	Product: Product,
	Order: Order,
	Review: Review
};


