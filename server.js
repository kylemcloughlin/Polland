const PORT = 8080;
const express = require('express');
const ENV = 'development';
const bodyParser = require("body-parser");
const mailGun = require("./jScript/mailGun.js");

const rankPoll = require("./lib/rank_poll");

const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig[ENV]);
const poll = require('./lib/poll')(knex);

const cookieParser = require('cookie-parser')

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');


/*
 * MIDDLEWARE
 */

// function seeCookies (req, res, next) {
// console.log("cookies running:", req.headers.cookie);
//  next();
// };

// app.use(seeCookies);
// app.use(express.static(__dirname + '/public'));
// app.set('view engine', 'ejs');
app.use(cookieParser('randomstring'));
// app.use(bodyParser.urlencoded({
//     extended: true
// }));



/*
 * ROUTES
 */

// HomePage
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/getEmail', (req, res) => {
    const email = req.body.email;

    valueObj = {
        email: email,
        encrypted_id: poll.generateRandomString(6)
    }
    poll.insertToDatabase('voter', valueObj)
        .then( () => {
            poll.getVoterBy('email', email)
                .then((result) => {
                    // obj with voter filter by email
                    let voterRow = result;
                    // redirect to create poll
                    res.redirect('/create/' + voterRow.id)
                })
        })
});



// Create Poll
app.get('/create/:creatorID', (req, res) => {
    let creatorID = req.params.creatorID;

    poll.getVoterBy('id', creatorID)
        .then( (result) => {
            let voterRow = result;
            res.render('create', {email: voterRow.email, creatorID: creatorID})
        })
});

app.post('/pollcreate/:creatorID', (req, res) => {

    const creatorID = req.params.creatorID;
    let friendsEmail = req.body.send_to;
    let question = req.body.pollquestion;
    let options = req.body.poll_opt;
    let desc = req.body.opt_des;

    // // insert friends into voter's table
    let insertVoter = [];
    if (Array.isArray(friendsEmail)) {
        friendsEmail.forEach( function(email) {
            insertVoter.push({
            email: email,
            encrypted_id: poll.generateRandomString(6)
            })
        })
        poll.insertToDatabase('voter', insertVoter);
    } else {
        insertVoter.push({
            email: friendsEmail,
            encrypted_id: poll.generateRandomString(6)
            });
        poll.insertToDatabase('voter', insertVoter);
    };

    // insert question and option into tables
    poll.insertToDatabase('question', {question: question, creator_id: creatorID})
        .then(() => {
            poll.query('id', 'question', {question: question, creator_id: creatorID})
                .then( (res) => {
                    let insertOption = [];
                    let questionID = res[0]['id'];

                    options.forEach( function(option, index) {
                        insertOption.push({
                        question_id: questionID,
                        option: option,
                        description: desc[index]
                        });

                    });
                    poll.insertToDatabase('option', insertOption);
                    return questionID
                    })
                .then((questionID)=> {
                    //send email to creator
                    poll.getVoterBy('id', creatorID)
                        .then((res) => {
                            console.log('res: ', res)
                            console.log('creatorID: ', creatorID)
                            let creatorEmail = res.email
                            let htmlCreator = `<h2>Your Polland Question: ${question}</h2>
                                <p>You create one poll and add your friends to vote</p>
                                <p>Vote here: <a href="http://localhost:8080/poll/${questionID}/${creatorID}">Vote now!</a></p>
                                <p>See results here: <a href="http://localhost:8080/poll/${questionID}/result">See results!</a></p>`
                            mailGun.sendTheMail(creatorEmail, htmlCreator);
                        });

                    //send email to voter
                    if (Array.isArray(friendsEmail)) {
                        friendsEmail.forEach( function(friend) {
                            poll.getVoterBy('email', friend)
                                .then( (res) => {
                                    let voterID = res.id;
                                    let htmlFriend = `<h2>Your Polland Question: ${question}</h2>
                                        <p>Your friend make one poll and add you to vote:
                                        <a href="http://localhost:8080/poll/${questionID}/${voterID}">Vote now!</a></p>`

                                    mailGun.sendTheMail(friend, htmlFriend);
                                })
                        });

                    } else {
                        poll.getVoterBy('email', friendsEmail)
                            .then( (res) => {
                                let voterID = res.id;
                                let htmlFriend = `<h2>Your Polland Question: ${question}</h2>
                                    <p>Your friend make one poll and add you to vote:
                                    <a href="http://localhost:8080/poll/${questionID}/${voterID}">Vote now!</a></p>`

                                mailGun.sendTheMail(friendsEmail, htmlFriend);
                            })
                    }
                })
        })

    res.redirect('/poll/create/confirm')
})


// Poll Confirm
app.post("create/submit", (req, res) => {
    //Error checking before submitting
    redirect('confirm');
});


app.get("/poll/create/confirm", (req, res) => {
    // console.log("/poll/create/confirm");
    res.render("confimationpage")
})


app.get("/poll/:questionID", (req, res) => {
    let ID = req.cookies.questionID;
    console.log(req.body);
    poll.getPoints(ID)
        .then((result) => {
            res.json(result);
        })


    })
    app.get("/poll/:questionID/result", (req, res) => {
        let ID = req.params.questionID;
        res.cookie("questionID", ID, { maxAge: 60000});
        // console.log("no render", ID)


        res.render('results')
})

// Rank Poll
app.get("/poll/:pollID/:voterID", (req, res) => {
    let questionID = req.params.pollID;
    let voterID = req.params.voterID;
    let options = [];

    poll.getOption(questionID)
        .then( (result) => {
            result.forEach( function(option) {
                options.push(option.option);
            });
            res.render('rank', {optionsArr: options, pollID: questionID, voterID:voterID});
        })
});

app.post("/poll/:pollID/:voterID/rank", (req,res) => {
    let questionID = req.body.pollID;
    let voterID = req.body.voterID;
    let points = req.body.array.reverse();
    // let insertPoints = [];

    points.forEach( function(point, index) {
        poll.query('id', 'option', {option: point, question_id: questionID})
            .then( (result) => {
                insertPoint = {
                    question_id: questionID,
                    option_id: result[0]['id'],
                    voter_id: voterID,
                    point: index
                }
                poll.insertToDatabase('vote', insertPoint)
            })
    });







});






app.listen(PORT, () => {
  console.log('App listening on port ' + PORT);
});
