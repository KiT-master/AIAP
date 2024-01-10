const express = require('express');
const router = express.Router();
const { ensureAuthenticated, authRole, authUser, authActive } = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');

// Models
// const Review = require("../models/Review");
// const Course = require('../models/Courses');
// const User = require('../models/User')
// const CourseLikes = require('../models/CourseLikes');
// const Subject = require('../models/Subject')

// // Send Grid
// const jwt = require('jsonwebtoken');
// const sgMail = require('@sendgrid/mail');


userdict = {}
fullname = {}

router.get('/', async function (req, res,) {


		res.render('index', {  });





});




module.exports = router;