const Seqelize = require('sequelize');
const db = require('../config/DBConfig');

const Chapter = db.define('Diary', {
    DiaryTitle : { type: Seqelize.STRING, allowNull: false },
    DiaryDate : { type: Seqelize.DATE, allowNull: false },
    DiarySentiment : { type: Seqelize.STRING, allowNull: false },
    DiaryContent : { type: Seqelize.STRING, allowNull: false }
});



module.exports = Chapter;
