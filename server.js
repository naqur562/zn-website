require("dotenv").config()
const express = require("express")
const ejs = require("ejs")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const https = require('node:https');

const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

const app = express()
app.set('view engine', 'ejs');
app.use(express.static("public"))
app.use(bodyParser.urlencoded({extended: true}));



// ------------------------------------------------------------ Authentication

app.use(session({ // <--call and set up session, pass options (recommended options from dev), must be placed here
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize()) // <--initialize passport, comes bundled with passport, start using for auth
app.use(passport.session()) //<-- tells app to use passport to set up session and deal with it

// ------------------------------------------------------------

mongoose.connect("mongodb://localhost:27017/znDB")

const eventsSchema = new mongoose.Schema({
    name: String,
    date: String,
    link: String
})
const userSchema = new mongoose.Schema({
    email: String,
    password: String
})

userSchema.plugin(passportLocalMongoose) //<-- add package as plugin, use this to salt/hash password and save into mongodb, does lots of heavy lifting

const Event = mongoose.model("Event", eventsSchema)

const User = mongoose.model("User", userSchema)


passport.use(User.createStrategy()); //<-- create local strategy for how to authenticate users using username/password

passport.serializeUser(User.serializeUser()); //<-- create encasement of user data (cookie)
passport.deserializeUser(User.deserializeUser()); //<-- break user data encasement (crack cookie)


// Get Routs---------------------

app.get("/", function(req,res){

    const url = "https://" + process.env.MAILCHIMPDC + ".api.mailchimp.com/3.0/lists?fields=lists.name?offset=0&count=1000"

    const options = {
        method: "GET",
        auth: process.env.MAILCHIMPKEY
    }

   const request = https.get(url, options, function(response){
        response.on("data", function(data){
            listNames = JSON.parse(data)
            Event.find(function(err, events){
                res.render("home", {events:events, listNames: listNames.lists})
            })
        })
    })

    
})

app.get("/admin", function(req, res){
    res.render("admin")
})


app.get("/cms", function(req, res){
    if (req.isAuthenticated()) {

        Event.find(function(err, events){
            if (err) {
                console.log(err)
            } else{
                res.render("cms", {events: events})
            }
        })

    } else {
        res.redirect("/admin")
    }
})

app.post("/addemail" , function(req,res){
    
    const fName = req.body.fName
    const lName = req.body.lName

    const url1 = "https://" + process.env.MAILCHIMPDC + ".api.mailchimp.com/3.0/lists?fields=lists.name,lists.id?offset=0&count=1000"

    const options1 = {
        method: "GET",
        auth: process.env.MAILCHIMPKEY
    }

   const request = https.get(url1, options1, function(response){
        response.on("data", function(data){
            const responseData = JSON.parse(data)
            const listInfo = responseData.lists

            var listID = listInfo.find(x => x.name === req.body.cityName).id;

            const url2 = "https://" + process.env.MAILCHIMPDC + ".api.mailchimp.com/3.0/lists/" + listID

            console.log(url2)

            console.log(req.body.fName + " " + req.body.lName)

            const data2 = {
                members: [{
                    email_address: req.body.email,
                    status: "subscribed",
                    merge_fields: {
                        FNAME: fName,
                        LNAME: lName
                        }
                    }]
            }

            const jsonData = JSON.stringify(data2)

            const options2 = {
                method: "POST",
                auth: process.env.MAILCHIMPKEY,
            }
            const request2 = https.request(url2, options2, function(response2){
                response2.on("data", function(data){
                    
                        console.log(response2.statusCode)
                        res.redirect("/")
        
                })
            })
            request2.write(jsonData);
            request2.end();

        })
    })



})


// Post Routs


app.post("/login", function(req, res) {
    const newUser = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(newUser, function(err){
        if (err){
            console.log(err)
        } else {
            passport.authenticate("local", {failureRedirect: "/admin", failureMessage: true})(req, res, function(){
                res.redirect("/cms")
            }) 
        }
    })
})

app.post("/logout", function(req, res){

    req.logout(function(err){
        if (!err){
            res.redirect("/")
        }
    })

})

app.post("/delete", function(req, res){
    
    var id = req.body.id

    Event.findByIdAndRemove(id, function(err){
        res.redirect("/cms")
    })
})

app.post("/addpage", function(req, res){
    res.render("addevent")
})

app.post("/addevent", function(req, res){
    
    var options = {
        weekday: "long",
        day: "numeric",
        month: "long"
    }

    var eventDate = new Date(req.body.eventDate)
    
    eventDateFormatted = eventDate.toLocaleDateString('en-US', options)


    const newEvent = new Event({
        name: req.body.eventName,
        date: eventDateFormatted,
        link: req.body.eventLink
    })
    
    newEvent.save()

    res.redirect("/cms")
})


//Launch Server

app.listen(3000, function(){
    console.log("Server started on port 3000")
})
