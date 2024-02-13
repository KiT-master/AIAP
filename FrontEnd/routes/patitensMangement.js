const express = require('express');
const router = express.Router();
const Role = require('../models/Role')
const User = require('../models/User');
const flashMessage = require('../helpers/messenger');
const { ensureAuthenticated, authRole, authActive } = require("../helpers/auth");
const sgMail = require('@sendgrid/mail');

const bcrypt = require('bcryptjs');

userdict = {}
fullname = {}
useremail = {}


router.all('*', ensureAuthenticated, authRole([1]), authActive)

router.get('/manageAccounts/:uid', async (req, res) => {
    let title = "Manage Account";
    await User.findAll({
        include: Role,raw:true , where: { CreatedBy: req.params.uid }
    })
        .then((account) => {
            res.render('./patientAccounts/accountManagement', { account, title });
        })
        .catch((err) =>
            console.log(err)
        );
});

router.get('/addAccounts', async (req, res) => {
    let title = "Manage Account";
    res.render('./patientAccounts/addAccounts')
});


router.get('/graph', async (req, res) => {
    let title = "Manage Account";
    res.render('./patientAccounts/charts')
});

router.post('/addAccounts', async (req, res) => {
    const body = req.body;
    let title = "Manage Account";
    let email = body.Email
    let username = body.Username
    let password = body.Password
    let fname = body.Fname
    let lname = body.Lname
    let uid = body.uid
    let adminUser = await User.findByPk(uid)
    let country = adminUser.country


         // Create new user record
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(password, salt);

    let user = await User.create({
        email,
        verified: 1,
        username,
        password: hash,
        fname,
        lname,
        NaN,
        NaN,
        country,
        NaN,
        status: undefined,
        active: 1,
        roleId: 2, // Patitent 
        CreatedBy:  parseInt(uid)
    });


    res.redirect('/patients/manageAccounts/' + uid)
});



module.exports = router;