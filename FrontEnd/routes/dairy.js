const express = require('express');
const router = express.Router();
const { ensureAuthenticated, authRole, authUser, authActive } = require('../helpers/auth');
const flashMessage = require('../helpers/messenger');
const Diary = require('../models/diary');
const date = new Date();
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];




function calendar(year) {

    let arr = new Array(12);
    for (let x = 0; x < arr.length; x++) {
        arr[x] = new Array(6);

    }

    for (let x = 0; x < arr.length; x++) {
        for (let y = 0; y < arr[x].length; y++) {
            arr[x][y] = new Array(7);
        }
    }

    for (let month = 0; month < arr.length; month++) {
        let startDayInWeek = new Date(year, month, 0).getDay() + 1;
        let monthLong = new Date(year, month + 1,0).getDate() + 1;

        let beforCount = 0;

        let counter = 1;

        let startCount = false;

        for (let x = 0; x < arr[month].length; x++) {
            for (let y = 0; y < arr[month][x].length; y++) {



                if (beforCount == startDayInWeek) {
                    startCount = true;
                } else {
                    beforCount++;
                }


                if (startCount == true) {

                    arr[month][x][y] = counter;
                    counter++;

                } else {
                    arr[month][x][y] = "";
                }

                if (counter > monthLong) {
                    arr[month][x][y] = "";

                }
            }
    }

}
}


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


router.get('/calander/:uid', ensureAuthenticated, async function (req, res,) {
    let diaries = await Diary.findAll({ raw: true, where: { userId: req.params.uid } })
    let currentDate = date.getDate() + " " + months[date.getMonth()] + " "+date.getFullYear();
    
    let currentDiary = await Diary.findOne({ raw: true, where: { userId: req.params.uid, DiaryDate:(date.getMonth() + 1) +"-"+ date.getDate() +"-"+date.getFullYear()}})

    diaries = diaryConvert(diaries)

    res.render('./dairy/calandear',{currentDate,currentDiary,diaries});
})

router.get('/write/:uid', ensureAuthenticated, async function (req, res,) {
    let diaries = await Diary.findAll({ raw: true, where: { userId: req.params.uid } })
    let currentDate = date.getDate() + " " + months[date.getMonth()] + " "+date.getFullYear();

    let currentDiary = await diaries[diaries.length - 1] //Diary.findOne({ raw: true, where: { userId: req.params.uid, DiaryDate:(date.getMonth() + 1) +"-"+ 1 +"-"+date.getFullYear()}})
    diaries = diaryConvert(diaries)

    console.log(currentDiary)

    if (currentDiary != undefined) {
        res.render('./dairy/updateDiary', {currentDate,currentDiary:currentDiary,diaries});
    }
    else{
        res.render('./dairy/dairy', {currentDate,diaries});
    }

    
})


router.get('/view/:uid/:id', ensureAuthenticated, async function (req, res) {
    let diary = await Diary.findByPk(req.params.id)
    let diaries = await Diary.findAll({ raw: true, where: { userId: req.params.uid } })
    
    diary = singleDairyConvert(diary)
    diaries = diaryConvert(diaries)

    res.render('./dairy/diary_view', {diary,diaries});
});

router.post('/write/:uid', ensureAuthenticated, async function (req, res,) {
    const body = req.body;
    var response_body = ""
    let uid = req.body.uid 
    let diaries = await Diary.findAll({ raw: true, where: { userId: req.params.uid } })
    
    diaries = diaryConvert(diaries)

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



router.post('/update/:did', ensureAuthenticated, async function (req, res,) {
    const body = req.body;
    let did = req.params.did;
    let uid = req.body.uid;
    let diaries = await Diary.findAll({ raw: true, where: { userId: uid } })

    diaries = diaryConvert(diaries)

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

    await Diary.update({
        DiaryTitle: DiaryTitle, DiarySentiment: DiarySentiment, DiaryContent: DiaryContent, DiaryDate: DiaryDate, userId: uid
        },
            { where: { id: parseInt(did)} }
    ).then(() =>{
        res.render('./dairy/dairy_response', {DiaryDate:DiaryDate,DiaryContent:DiaryContent,DiarySentiment:DiarySentiment,diaries:diaries});
    })
    })
});


module.exports = router;