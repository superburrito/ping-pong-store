'use strict';
//var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

module.exports = db.define('product', {
    price: {
        type: Sequelize.INTEGER
    },
    name: {
        type: Sequelize.STRING
    },
    category: {
        type: Sequelize.STRING
        //effectively will validate in the front end via drop-down menu
    },
    brand: {
        type: Sequelize.STRING
        //drop-down
    },
    inventory: {
        type: Sequelize.INTEGER
    },
    description: {
        type: Sequelize.TEXT
    },
    imageUrl: {
        type: Sequelize.STRING
    }
}, {
    getterMethods: {
        rating: function () {
            //define this later
        }
    }//,
//     instanceMethods: {
//         sanitize: function () {
//             return _.omit(this.toJSON(), ['password', 'salt']);
//         },
//         correctPassword: function (candidatePassword) {
//             return this.Model.encryptPassword(candidatePassword, this.salt) === this.password;
//         }
//     },
//     classMethods: {
//         sortBy: function (param) {
//             return crypto.randomBytes(16).toString('base64');
//         },
//         encryptPassword: function (plainText, salt) {
//             var hash = crypto.createHash('sha1');
//             hash.update(plainText);
//             hash.update(salt);
//             return hash.digest('hex');
//         }
//     },
//     hooks: {
//         beforeValidate: function (user) {
//             if (user.changed('password')) {
//                 user.salt = user.Model.generateSalt();
//                 user.password = user.Model.encryptPassword(user.password, user.salt);
//             }
//         }
//     }
});
