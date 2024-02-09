const sequelize = require('sequelize');
const db = require('../config/DBConfig')

const Role = require('./Role')

const User = db.define('user', {
    email: { type: sequelize.STRING, allowNull: false, validate: { isEmail: true } },
    verified: { type: sequelize.TINYINT(1), allowNull: false },
    username: { type: sequelize.STRING, allowNull: false },
    password: { type: sequelize.STRING, allowNull: false },
    fname: { type: sequelize.STRING(50), allowNull: false },
    lname: { type: sequelize.STRING(50), allowNull: false, },
    gender: { type: sequelize.STRING(1) },
    birthday: { type: sequelize.DATEONLY },
    country: { type: sequelize.STRING, allowNull: false },
    interest: { type: sequelize.STRING },
    status: { type: sequelize.STRING(300) },
    profilePicURL: { type: sequelize.STRING },
    active: { type: sequelize.TINYINT(1), allowNull: false },
    logonAt: { type: sequelize.DATE }
},{
    freezeTableName: true
});

// User.sync();
// Role.sync();


module.exports = User