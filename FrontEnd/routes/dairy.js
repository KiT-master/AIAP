const express = require('express');
const router = express.Router();
const { ensureAuthenticated, authRole, authUser, authActive } = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');

router.get('/write', async function (req, res,) {
    res.render('./dairy/dairy');
});

router.post('/write', async function (req, res,) {
    const body = req.body;
    var response_body = ""

    console.log(JSON.stringify(body))

    const response = await fetch("http://localhost:8000/", {
        method: 'POST',
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    });

    response.json().then(data => {
        response_body = data.label;
        console.log(response_body)
        res.render('./dairy/dairy_response', {response_body});
      });

});


module.exports = router;