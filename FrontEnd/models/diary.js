const Seqelize = require('sequelize');
const db = require('../config/DBConfig');

const Chapter = db.define('Diary', {
    DiaryID : { type: Seqelize.INTEGER },
    DiaryDate : { type: Seqelize.DATE },
    DiaryContent : { type: Seqelize.STRING }
});



module.exports = Chapter;
