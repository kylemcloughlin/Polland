<<<<<<< HEAD
=======
const PORT = 8080;
const express = require('express');
const ENV = 'development';
const bodyParser = require("body-parser");
const mailGun = require("./jScript/mailGun.js");

const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig[ENV]);
const poll = require('./lib/poll')(knex);

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');


/*
 * MIDDLEWARE
 */





/*
 * ROUTES
 */

// HomePage
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/getEmail', (req, res) => {
    const email = req.body.email;
    console.log(email);
    // mailGun.sendTheMail(email, "your mama is fat");
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
                    res.json(voterRow);
                })
        })
});



// Create Poll
app.get('/create/:voterID', (req, res) => {
    let voterID = req.params.voterID;

    poll.getVoterBy('id', voterID)
        .then( (result) => {
            let voterRow = result;
            res.json(voterRow);
        })
});

app.post('/HERE_YOUR_POST_FORM', (req, res) => {
    let table;
    let valueObj;
    poll.insertToDatabase(table, valueObj)
        .then( () => {
            res.redirect()
        })
})

app.post("/poll/create", (req, res) => {
    mailGun.sendTheMail(creatoremail, `check this link: <a href='${link that leads to results}'>link</a>`);
    mailGun.sendTheMail(listOfEmails, `check this link: <a href='${link that leads ranking}'>link</a>`);
    redirect('confirm');
});


// Poll Confirm
app.post("create/submit", (req, res) => {
    //Error checking before submitting
    redirect('confirm');
});


// Rank Poll
app.get("/poll/:pollID", (req, res) => {
    res.render('rank');
});
app.post("/poll/:pollID/rank", (req,res) => {
    let tempArr = req.body.array;
    res.resultArr = tempArr.reverse();
    console.log(resultArr);
    next();

});
app.get("/poll/:pollID/results", (req, res) => {
    //logic to check if user has access to the results
    console.log("im in");
    if (true) {
        var dataArr = {
          array: resultArr,
        }
        res.render(`results`, dataArr);
    } else {
        console.log("You do not have acess to the resutls");
    }
});


// Poll Results
app.get('/poll/:questionID/result', (req, res) => {
    let questionID = req.params.questionID;

    poll.getPoints(questionID)
        .then( (result) => {
            res.json(result)
        })
})




app.listen(PORT, () => {
  console.log('App listening on port ' + PORT);
});
>>>>>>> 17a86fb4f38a5b8ddd2863df44dd8dd71e56cbf3
