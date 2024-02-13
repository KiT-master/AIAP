const mySQLDB = require('./DBConfig');
const Role = require('../models/Role')
const User = require('../models/User');
const Diary = require('../models/diary')
// const Review = require('../models/Review');
// const Forum = require('../models/Forum');
// const Course = require('../models/Courses');
// const Voucher = require('../models/Voucher');
// const Chapter = require('../models/chapter');
// const Video = require('../models/video');
// const Quiz = require('../models/Quizes');
// const Comment = require('../models/Comments');
//const ForumLike = require('../models/');
// const Courselike = require('../models/CourseLikes');
// const ForumLikeFavs = require('../models/ForumLikeFavs');
// const Subject = require('../models/Subject');



//Generate users
roleTypes = ["ADMIN", "CARETAKER", "PATIENT"];

let adminAcc =
    [
        ['nicholasong75@gmail.com', 1, 'n1cholas.ong', '$2a$10$sUm1yYEeoTRYxTEDyxqVFuaETT4mMBk0vYgPgrJrgVQ98YRP9NBRm', 'Nicholas', 'Ong', 'M', null, 'SG', '2,3,4,5,6,7,8,10', null, null, 1],
        ['Nat@gmail.com', 1, 'nat', '$2a$10$kFXNArrd0alYlG/zCzGfz./0m86G4Amgdub6656CHR4i.Aysc8NUi', 'Nat', 'Lee', 'M', '1995-09-30', 'US', '1,3,4,8', null, null, 1],
        ['lucasleejiajin@gmail.com', 1, 'Xepvoid', '$2a$10$6fwMyC0jwW34PznlgWM8wOoyx1ritkY38XnklD4g4QLLyxoErxiyy', 'Lucas', 'Lee', 'M', '2004-01-17', 'SG', '1,4,5,9,10', null, null, 1],
        ['Kiat0878@gmail.com', 1, 'Kiat10', '$2a$10$jCtrCrWCNFhXI9kpEOgEeeTHxJi5yLFO2Bfkg.fZ2bJ2rx1qOD6mS', 'Kai Kiat', 'Lo', null, '2002-01-31', 'AT', '1,4,9,10', null, null, 1],
        ['johnsmith123@curodemy.com', 1, 'johnsmith23', '$2a$10$MSYP/5u38iPwbk9gqyeuAeoN7cDzQwy32x9paLMu13l1fiewJ5hhS', 'John', 'Smith', '', null, '', null, null, null, 2]
    ];


async function generateUser() {
    for (let i = 0; i < 50; i++) {
        let randomBit = Math.floor(Math.random() * 2);
        let randomInt1 = Math.floor(Math.random() * 10);
        let randomInt2 = Math.floor(Math.random() * 10);
        let randomInt3 = Math.floor(Math.random() * 10);

        let fname = ["James", "Robert", "John", "John", "Michael", "David", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth"]
        let lname = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Ong", "Lee", "Tan"]
        let randomFName = fname[Math.floor(Math.random() * fname.length)];
        let randomLName = lname[Math.floor(Math.random() * lname.length)];

        let password = "$2a$10$kFXNArrd0alYlG/zCzGfz./0m86G4Amgdub6656CHR4i.Aysc8NUi";
        let username = `${randomFName}${randomLName}${randomInt1}${randomInt2}${randomInt3}`;

        let gender = ["M", "F"];

        // let user = await User.findOne({ where: { email: `${username}@curodemy.com` } });

        // if (!user) {
        User.create(
            {
                email: `${username}@curodemy.com`,
                verified: randomBit,
                username: username,
                password: password,
                fname: randomFName,
                lname: randomLName,
                gender: gender[randomBit],
                country: '',
                active: 1,
                roleId: 2,
            }
        )
        console.log(username + " created")
        // } else {
        //     console.log("similar user found")
        // }
    }
}

async function generateDiaires(days){

    let dayCount =  Math.floor(days/3)
    let currentDate = 1

    for (var i=1; i<=dayCount; i++){
        Diary.create({
            DiaryTitle: 'Today is good',
            DiaryContent: 'Today is good day!',
            DiarySentiment: 'postive',
            DiaryDate: '01-'+currentDate+'-2024',
            userId: 5
        })
        currentDate ++;
    }

    for (var i=1; i<=dayCount; i++){
        Diary.create({
            DiaryTitle: 'Today is bad',
            DiaryContent: 'Today is bad day!',
            DiarySentiment: 'negative',
            DiaryDate: '01-'+currentDate+'-2024',
            userId: 5
        })
        currentDate ++;
    }



}



// If drop is true, all existing tables are dropped and recreated 
const setUpDB = (drop) => {
    mySQLDB.authenticate()
        .then(async() => {
            
            console.log('Database connected');
            /* Defines the relationship where a user has many videos. The primary key from user will be a foreign key in video. */
            //Declaring the parent realtionship
            Role.hasOne(User);
            User.hasMany(Diary);
            // User.hasMany(Forum);
            // User.hasMany(Review);
            // User.hasMany(Courselike);
            // User.hasMany(Course);
            // User.hasMany(Voucher);
            // User.hasMany(Comment);
            // User.hasMany(ForumLikeFavs);
            // User.hasMany(Course)
            // //Course.hasMany(Quiz);
            // Course.hasMany(Chapter);
            // Course.hasMany(Review);
            // Course.hasMany(Courselike);
            // //Course.hasMany(Subject);
            // Chapter.hasOne(Video);
            // Chapter.hasMany(Quiz);
            // //Forum bullshit
            // Forum.belongsTo(User);
            // Forum.hasMany(Comment);
            // Forum.hasMany(ForumLikeFavs);
            // ForumLikeFavs.belongsTo(User);
            // ForumLikeFavs.belongsTo(Forum);
            // Comment.belongsTo(User);
            // Comment.belongsTo(Forum);
            // //Decalring the child realtionship
            // Courselike.belongsTo(User);
            // Courselike.belongsTo(Course);
            Diary.belongsTo(User)
            User.belongsTo(Role);
            // User.belongsToMany(Course, { through: 'UserCourses' });
            // Comment.belongsTo(Forum);
            // Chapter.belongsTo(Course);
            // Review.belongsTo(Course);
            // Quiz.belongsTo(Chapter);
            // Video.belongsTo(Chapter);
            // Voucher.belongsToMany(User, { through: 'UserVouchers' });
            // Course.belongsToMany(User, { through: 'UserCourses' });
            // Course.belongsToMany(Subject,{through:'CourseSubjects'});
            // Subject.belongsToMany(Course,{through:'CourseSubjects'});
            // Course.belongsTo(User)
            await mySQLDB.sync({
                force: drop
            });
        }).then(async () => {

           await Role.findAndCountAll()
            .then(result => {
                if (result.count < 1) {
                    roleTypes.forEach((role, index) => {
                        Role.create({
                            id: index + 1,
                            title: role
                        })
                    });
                };
            });



            await User.findAndCountAll()
            .then(async result => {
                if (result.count < 1) {
                    adminAcc.forEach((value) => {
                        User.create({
                            email: value[0],
                            verified: value[1],
                            username: value[2],
                            password: value[3],
                            fname: value[4],
                            lname: value[5],
                            gender: value[6],
                            birthday: value[7],
                            country: value[8],
                            interest: value[9],
                            status: value[10],
                            profilePicURL: value[11],
                            active: 1,
                            roleId: value[12],
                        })
                    });
            await generateUser();
            //await generateDiaires(31)
            console.log("\nGenerate user complete")
        };
    });

        })
        .catch(err => console.log(err));
};





module.exports = { setUpDB }