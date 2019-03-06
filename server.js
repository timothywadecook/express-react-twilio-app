const express = require('express'); // so we can use express 
const app = express(); // instantiate a server object via express and call it app
const mongoose = require('mongoose');
const MessagingResponse = require('twilio').twiml.MessagingResponse; // Twilio!
const bodyParser = require('body-parser'); // Twilio
const http = require('http'); // Twilio
const port = process.env.PORT || 5000; 
// note we had to let our webpack development server know to proxy to this port 5000. proxy added in ./client/package.json 


// ****************************************************
// Middleware + connect to db
// ****************************************************
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("./client/build")); // for deployment serve static files in build
app.use(bodyParser.urlencoded({ extended: false })); // Twilio

const db = mongoose.connect('mongodb://localhost/tinyImprovementsDb', { useNewUrlParser: true }); // will need to change for deployment


// console.log that the server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));

// ****************************************************
// Models
// ****************************************************
const Schema = mongoose.Schema;

const kudosSchema = new Schema({
    title: String,
    body: String,
    sender: { type: Schema.Types.ObjectId, ref: 'User' }, 
    recipient: { type: Schema.Types.ObjectId, ref: 'User' }
});

const userSchema = new Schema({
    name: String,
});

const Kudos = mongoose.model('Kudos', kudosSchema);
const User = mongoose.model('User', userSchema);


// ****************************************************
// Seed DB
// ****************************************************
// db.kudos.deleteMany({});
// db.user.deleteMany({});

const bob = new User({name: "Bob"});
const jack = new User({name: "Jack"});
const jill = new User({name: "Jill"});
const kudos1 = new Kudos({title: "I'm the first!", body: "If you ain't first, yer last.", sender: bob._id, recipient: jack._id })
const kudos2 = new Kudos({title: "I'm the second!", body: "If you ain't first, yer second.", sender: jack._id, recipient: jill._id })
const kudos3 = new Kudos({title: "I'm the third!", body: "If you ain't first, yer third.", sender: jill._id, recipient: bob._id })

const seedDb = [bob, jack, jill, kudos1, kudos2, kudos3];


seedDb.forEach(item => {
    item.save( (err, obj)=> {
        if (err) return console.error(err);
    })
})

// ****************************************************
// Routes
// ****************************************************

// Kudos routes
app.get('/api/kudos', (req, res) => { // returns all kudos 
  Kudos.find()
  .populate('sender')
  .populate('recipient')
  .exec((err, kudos) => {
    if (err) return handleError(err);
    res.json(kudos)
  })
});
app.post('/kudos', (req, res) => { // add new kudos to db, then sends back all (updated) kudos
    const kudos = req.body // req.body = {title: "", body: "", sender: "", recipient: ""} 
    Kudos.create(kudos)
    .then((newKudos) => {res.json(newKudos)})
    .catch((err) => {res.json(err)})
})

// Users routes
app.get('/api/users', function (req, res) {
    User.find()
    .then(function (allUsers) {
      res.json(allUsers);
    })
    .catch(function (err) {
      res.json(err);
    });
  });

// ****************************************************
// Twilio Route
// ****************************************************
// when an sms is received 
// store the message 
// if valid entry... then add kudos to the db (if new user, add user)
// after updateing the db, tell the dom to rerender?
app.post('/sms', (req, res) => 
{
    const incomingMsg = req.body.Body;
    const twiml = new MessagingResponse();
    const result = incomingMsg.match( /[^\.!,\]+[\.!\-?]+/g ); // split it up by puncuation 
        if (result.length < 4) 
        {
            const msg = twiml.message('Please use the correct kudos posting format. "Hey Name, Your message! More message. -Name" Thanks :)')
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        } 
        else 
        {
            const sender = result.shift().split(' ').pop().trim();
            const recipient = result.pop().trim();
            const title = result.shift().trim();
            const body = result.reduce((total, sentence) => { return total + sentence } );
            console.log(sender, recipient, title, body);
            if (sender && recipient && title && body)
            {
                // find users in DB or create users
                User.findOneAndUpdate( { name: sender }, { name: sender}, {upsert: true} )
                    .then((dbsender) => {
                        console.log('dbsender = ',dbsender)
                        const senderId = dbsender._id;
                        findRecipient(senderId)
                    }).catch((err) => {res.json(err)})

                const findRecipient = (senderId) => {
                    User.findOneAndUpdate( { name: recipient }, { name: recipient }, { upsert: true } )
                    .then((dbrecipient) => {
                    console.log("dbrecipient = ", dbrecipient);
                    console.log('dbsender = ', senderId);
                    const kudos = 
                    { 
                        title: title,
                        body: body,
                        sender: senderId,
                        recipient: dbrecipient._id
                    };
                    console.log("kudos! ", kudos)
                    addKudos(kudos);
                    }).catch((err) => {res.json(err)})
                }
                
                const addKudos = (kudos) => {
                    Kudos.create(kudos) 
                        .then((newKudos) => 
                        {
                            const msg = twiml.message('Thanks for sharing some kudos!!');
                            console.log('new kudos:  ', newKudos)
                            res.writeHead(200, {'Content-Type': 'text/xml'});
                            res.end(twiml.toString());
                        })
                        .catch( (err) => {res.json(err)} )  
                }      
            }        
            else 
            {
                const msg = twiml.message('Please check your format and try again :)')
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
            }
        }
        
});

  // run ngrok http 5000  (DONE)
  // test that text messages come through (DONE)
  // test that i am parsing the messages as expected  (DONE)
  // 
  // make kudos post only work for existing people (if .includes([bob, jack, jill]) then extract first/to and second/from and post kudos)
  // make adding users work "new: First"
  // test that I am writing the kudos to database correctly
  // test that the front end is updating after the database gets a new kudos post
  // add users icon and list to frontend 
  // deploy to heroku
  // test heroku deployment 

  // check out CHANGE STREAMS or do polling or do websockets.io