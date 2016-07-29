'use strict';

var db = require('../_db.js');
var User = require('./user.model.js');
var Product = require('./product.model.js');
var Order = require('./order.model.js');
var Review = require('./review.model.js');
var Orderproduct = require('./orderproduct.model.js');

//Relationships
// Many-to-one, Users to Orders
User.hasMany(Order);
Order.belongsTo(User);

// Many-to-one, Orders to Orderproducts
Order.hasMany(Orderproduct);
Orderproduct.belongsTo(Order);

// Many-to-one, Products to Orderproducts
Product.hasMany(Orderproduct);
Orderproduct.belongsTo(Product);

// Many-to-many, Products to Reviews, Users to Reviews
Product.hasMany(Review);
User.hasMany(Review);


module.exports = {
	User: User,
	Orderproduct: Orderproduct,
	Product: Product,
	Order: Order,
	Review: Review
};


