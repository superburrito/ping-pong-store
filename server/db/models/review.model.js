'use strict';
//var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('review', {
    title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    score: {
        type: Sequelize.INTEGER,
        allowNull: false
        // 1-5 validated in front end
    },
    feedback: {
        type: Sequelize.TEXT
    },
    firstName: {
        type: Sequelize.STRING,
        defaultValue: ''
    },
    lastName: {
        type: Sequelize.STRING,
        defaultValue: ''
    }
// }, {
//     classMethods: {
//         sortBy: function (param) {
//             //define this later
//         }
//     }
});
