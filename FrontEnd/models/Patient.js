const sequelize = require('sequelize');
const db = require('../config/DBConfig')

const Role = require('./Role')

const User = db.define('user', {
    fname: { type: sequelize.STRING(50), allowNull: false },
    lname: { type: sequelize.STRING(50), allowNull: false, },
    gender: { type: sequelize.STRING(1) },
    birthday: { type: sequelize.DATEONLY },
    profilePicURL: { type: sequelize.STRING },
},{
    freezeTableName: true
});

// User.sync();
// Role.sync();


module.exports = User