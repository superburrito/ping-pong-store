'use strict';
//var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('review', {
    title: {
        type: Sequelize.STRING
    },
    score: {
        type: Sequelize.INTEGER
        // 1-5 validated in front end
    },
    feedback: {
        type: Sequelize.TEXT
    }
// }, {
//     classMethods: {
//         sortBy: function (param) {
//             //define this later
//         }
//     }
});
