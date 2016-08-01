'use strict';

var db = require('../_db.js');
var User = require('./user.model.js');
var Product = require('./product.model.js');
var Order = require('./order.model.js');
var Review = require('./review.model.js');
var Orderproduct = require('./orderproduct.model.js');

//Relationships
// Many Orders to One User
User.hasMany(Order);
Order.belongsTo(User);

// Many Orderproducts to One Order
Order.hasMany(Orderproduct);
Orderproduct.belongsTo(Order);

// Many Orderproducts to One Product
Product.hasMany(Orderproduct);
Orderproduct.belongsTo(Product);

// Many Reviews to One Product 
Product.hasMany(Review);
Review.belongsTo(Product);

// Many Reviews to One User 
User.hasMany(Review);
Review.belongsTo(User);


module.exports = {
	User: User,
	Orderproduct: Orderproduct,
	Product: Product,
	Order: Order,
	Review: Review
};


