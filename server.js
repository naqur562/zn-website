require("dotenv").config()
const express = require("express")
const encrypt = require("mongoose-encryption")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")

const app = express()
app.use(express.static("public"))

app.use(bodyParser.urlencoded({extended: true}));

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

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields:["password"]}); 

const Event = mongoose.model("Event", eventsSchema)

const User = mongoose.model("User", userSchema)

const ejs = require("ejs")
app.set('view engine', 'ejs');

// Get Routs

app.get("/", function(req,res){

    Event.find(function(err, events){
        if (err) {
            console.log(err)
        } else{
            res.render("home", {events})
        }
    })
})

app.get("/admin", function(req, res){
    res.render("admin")
})


// Post Routs

app.post("/login", function(req, res) {
    User.findOne({email:req.body.email}, function(err, user) {
        
        if (err){
            console.log(err)
        } else {
            if (req.body.password == user.password){

                Event.find(function(err, events){
                    if (err) {
                        console.log(err)
                    } else{
                        res.render("cms", {events})
                    }
                })

            } else {
                res.render("admin")
            }
        }
    })
})

app.post("/delete", function(req, res){
    
    var id = req.body.id

    Event.findByIdAndRemove(id, function(err){
        Event.find(function(err, events){
            if (err) {
                console.log(err)
            } else{
                res.render("cms", {events})
            }
        })
    })
})

app.post("/addpage", function(req, res){
    res.render("addevent")
})

app.post("/addevent", function(req, res){
    
    const newEvent = new Event({
        name: req.body.eventName,
        date: toString(req.body.eventDate),
        link: req.body.eventLink
    })
    
    newEvent.save()

    Event.find(function(err, events){
        if (err) {
            console.log(err)
        } else{
            res.render("cms", {events})
        }
    })
})


//Launch Server

app.listen(3000, function(){
    console.log("Server started on port 3000")
})
