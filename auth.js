const express = require("express"),
    router = express.Router(),
    user = require("./models/user"),
    bodyparser = require("body-parser"),
    bcrypt = require("bcryptjs"),
    passport = require('passport'),
    session = require('express-session'),
    cookieParser = require('cookie-parser'),
    flash = require('connect-flash'),
    nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'jhasuraj020@gmail.com',
        pass: '@itsgabru'
    }
});

router.use(bodyparser.urlencoded({ extended: true }));
// using cookie-parser and session 
router.use(cookieParser('secret'));
router.use(session({
    secret: 'secret',
    maxAge: 3600000,
    resave: true,
    saveUninitialized: true,
}));
// using passport for authentications 
router.use(passport.initialize());
router.use(passport.session());
router.use(flash());

// MIDDLEWARES
// Global variable
router.use(function (req, res, next) {
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    next();
});

router.get("/register", function (req, res) {
    res.render("register");
})

router.post('/register', (req, res) => {
    var { email, username, password, confirmpassword } = req.body;
    var err;
    if (!email || !username || !password || !confirmpassword) {
        err = "Please Fill All The Fields...";
        res.render('register', { 'err': err });
    }
    if (password != confirmpassword) {
        err = "Passwords Don't Match";
        res.render('register', { 'err': err, 'email': email, 'username': username });
    }
    if (typeof err == 'undefined') {
        user.findOne({ email: email }, function (err, data) {
            if (err) throw err;
            if (data) {
                console.log("User Exists");
                err = "User Already Exists With This Email...";
                res.render('index', { 'err': err, 'email': email, 'username': username });
            } else {
                bcrypt.genSalt(10, (err, salt) => {
                    if (err) throw err;
                    bcrypt.hash(password, salt, (err, hash) => {
                        if (err) throw err;
                        password = hash;
                        user({
                            email,
                            username,
                            password,
                        }).save((err, data) => {
                            if (err) {
                                err = "Username alreaady exists";
                                res.render('register', { 'err': err });
                            };
                            req.flash('success_message', "Registered Successfully.. Login To Continue..");
                            res.redirect('/login');
                        });
                    });
                });
            }
        });
    }
    var mailOptions = {
        from: 'jhasuraj020@gmail.com',
        to: email,
        subject: 'Sending Email using Node.js',
        text: `Hi this is email from suraj jha. always foru`
        // html: '<h1>Hi Smartherd</h1><p>Your Messsage</p>'        
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
});

//authenticatin strategy
// ---------------
var localStrategy = require('passport-local').Strategy;
passport.use(new localStrategy({ usernameField: 'email' }, (email, password, done) => {
    user.findOne({ email: email }, (err, data) => {
        if (err) throw err;
        if (!data) {
            return done(null, false, { message: "User Doesn't Exists.." });
        }
        bcrypt.compare(password, data.password, (err, match) => {
            if (err) {
                return done(null, false);
            }
            if (!match) {
                return done(null, false, { message: "Password doesn't match" });
            }
            if (match) {
                return done(null, data);
            }
        });
    });
}));

passport.serializeUser(function (user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
    user.findById(id, function (err, user) {
        cb(err, user);
    });
});
// ---------------
// end of autentication statregy

router.get("/login", function (req, res) {
    res.render("login", { message: req.flash('message'), success: req.flash('success') });
})

router.post('/login', (req, res, next) => {
    req.flash("success", "successfully logged in!!");
    passport.authenticate('local', {
        failureRedirect: '/login',
        successRedirect: '/campgrounds',
        failureFlash: true,
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout();
    req.flash("success", "successfully logged out.");
    res.redirect('/campgrounds');
});

module.exports = router;