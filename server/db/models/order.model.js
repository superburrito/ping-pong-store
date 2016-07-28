'use strict';
//var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('order', {
    status: {
        type: Sequelize.INTEGER,
        validate: {
            max:3,
            min:0,
        	isNumeric: true
        },
        allowNull: false
    },
    address: {
    		type: Sequelize.STRING,
    		allowNull: false
    }
});
