const express = require('express');
const router = express.Router();
const { ensureAuthenticated, authRole, authUser, authActive } = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');
const Diary = require('../models/diary');
const date = new Date();
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function singleDairyConvert(Diary){
    var day = new Date(Date.parse(Diary.DiaryDate));
    Diary.DiaryDate =  day.getDate() + " " + months[day.getMonth()] ;

    return Diary
}

function diaryConvert(diaries){
    diaries.forEach(Diary => {
        var day = new Date(Date.parse(Diary.DiaryDate));
        Diary.DiaryDate =  day.getDate() + " " + months[day.getMonth()] ;
    });

    return diaries
}

router.get('/write/:uid', async function (req, res,) {
    let diaries = await Diary.findAll({ raw: true, where: { userId: req.params.uid } })

    diaries = diaryConvert(diaries)

    res.render('./dairy/dairy', {diaries});
})


router.get('/view/:uid/:id', async function (req, res) {
    let diary = await Diary.findByPk(req.params.id)
    let diaries = await Diary.findAll({ raw: true, where: { userId: req.params.uid } })
    
    diary = singleDairyConvert(diary)
    diaries = diaryConvert(diaries)

    res.render('./dairy/diary_view', {diary,diaries});
});

router.post('/write/:uid', async function (req, res,) {
    const body = req.body;
    var response_body = ""
    let uid = req.body.uid 
    let diaries = await Diary.findAll({ raw: true, where: { userId: req.params.uid } })

    console.log(JSON.stringify(body))

    const response = await fetch("http://127.0.0.1:5000", {
        method: 'POST',
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    });

    response.json().then(async(data) => {
        Sentiment = data.label;
        let DiaryDate = (date.getMonth() + 1) +"-"+ date.getDate() +"-"+date.getFullYear();
        let DiaryTitle = body.title;
        let DiarySentiment = Sentiment;
        let DiaryContent = body.Message;
     
        await Diary.create({
            DiaryTitle:DiaryTitle,DiaryDate: DiaryDate, DiarySentiment: DiarySentiment, DiaryContent: DiaryContent, userId: uid
        }).then(() => {
            res.render('./dairy/dairy_response', {DiaryDate:DiaryDate,DiaryContent:DiaryContent,DiarySentiment:DiarySentiment,diaries:diaries});
        })
      });

});


module.exports = router;