const express = require("express"),
    app = express(),
    bodyparser = require("body-parser"),
    mongoose = require("mongoose"),
    cmpground = require("./models/campground"),
    comment = require("./models/comment"),
    session = require('express-session'),
    cookieParser = require('cookie-parser'),
    flash = require('connect-flash'),
    methodOverride = require("method-override"),
    user = require("./models/user"),
    multer = require('multer'),
    path = require('path');

// Authentication routes
var authroutes = require("./auth");
app.use(authroutes);

//connect-flash setup
app.use(cookieParser('secret'));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(flash());

mongoose.connect("mongodb+srv://admin-suraj:itsgabru@clustermine-vrxpf.mongodb.net/yelcamp", { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.set('useFindAndModify', false);
app.use(bodyparser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.set("view engine", "ejs");
app.use(express.static("public"));

app.listen(3000 || process.env.PORT);

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
})

var upload = multer({ storage: storage }).single('file');

app.use(function (req, res, next) {
    // res.locals.currUser = req.user;             // res.local does'n work on partials
    // res.locals.message = req.flash('message');
    next();
});

const checkAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        return next();
    } else {
        req.flash("message", "please log in first!");
        res.redirect('/login');
    }
}

const checkOwnership = function (req, res, next) {
    if (req.isAuthenticated()) {
        cmpground.findById(req.params.id, function (err, foundcmpground) {
            if (err) {
                res.redirect("back");
            } else {
                if (foundcmpground.author.id.equals(req.user._id)) {
                    next();
                }
                else {
                    req.flash("message", "You dont hAVe permission to do that...");
                    res.redirect("back");
                }
            }
        })
    }
    else {
        req.flash("message", "You need log in to do that...");
        res.redirect("back");
    }
}

const checkCommentOwnership = function (req, res, next) {
    if (req.isAuthenticated()) {
        comment.findById(req.params.comment_id, function (err, foundcomment) {
            if (err) {
                res.redirect("back");
            } else {
                if (foundcomment.author.id.equals(req.user._id)) {
                    next();
                }
                else {
                    req.flash("message", "You dont hAVe permission to do that...");
                    res.redirect("back");
                }
            }
        })
    }
    else {
        req.flash("message", "first you need to log in..");
        res.redirect("back");
    }
}

//routes
app.get("/", function (req, res) {
    res.render("landing", { currUser: req.user, message: req.flash('message'), success: req.flash('success') });
})

app.get("/campgrounds", function (req, res) {
    cmpground.find({}, function (err, allcmpgrounds) {
        if (err) {
            console.log(err);
        } else {
            res.render("campground/campgrounds", { campgrounds: allcmpgrounds, currUser: req.user, message: req.flash('message'), success: req.flash('success') });
        }
    })
})

app.post("/campgrounds", checkAuthenticated, upload, function (req, res) {
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newcamp = {
        name: req.body.camp,
        image: req.file.filename,
        desc: req.body.desc,
        author: author
    }
    cmpground.create(newcamp, function (err, newlycreated) {
        if (err) {
            req.flash("message", "something went wrong...");
            res.redirect("/campgrounds/newcamp");
        } else {
            req.flash("message", "campground succesfully created!!");
            res.redirect("/campgrounds");
        }
    })
})

app.get("/campgrounds/add", checkAuthenticated, function (req, res) {
    res.render("campground/newcamp", { currUser: req.user, message: req.flash('message'), success: req.flash('success') });
})

app.get("/campgrounds/:id", function (req, res) {
    cmpground.findById(req.params.id).populate("comments").exec(function (err, foundcmpground) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            res.render("campground/show", { cmpground: foundcmpground, currUser: req.user, message: req.flash('message'), success: req.flash('success') });
        }
    })
})

app.get("/campgrounds/:id/edit", function (req, res) {
    if (req.isAuthenticated()) {
        cmpground.findById(req.params.id, function (err, foundcmpground) {
            if (err) {
                console.log(err);
                res.redirect("back");
            } else {
                //foundcmground.author.id is a mongoose object id & req.user._id is a string
                if (foundcmpground.author.id.equals(req.user._id)) {
                    res.render("campground/edit", { cmpground: foundcmpground, currUser: req.user, message: req.flash('message'), success: req.flash('success') });
                }
                else {
                    req.flash("message", "You dont hAVe permission to do that...");
                    res.redirect("back");
                }
            }
        })
    }
    else {
        req.flash("message", "You need to log in to do that...");
        res.redirect("back");
    }
})

app.post("/campgrounds/:id", checkOwnership, upload, function (req, res) {
    var editedcamp = {
        name: req.body.name,
        image: req.file.filename,
        desc: req.body.desc
    }
    cmpground.findByIdAndUpdate(req.params.id, editedcamp, function (err, foundcmpground) {
        req.flash("success", "updated successfully!");
        res.redirect("/campgrounds/" + req.params.id);
    })
})

app.delete("/campgrounds/:id", checkOwnership, function (req, res) {
    cmpground.findByIdAndRemove(req.params.id, req.body.cmp, function (err) {
        req.flash("success", "Deleted successfully!");
        res.redirect("/campgrounds");
    })
})


//comment routes
app.get("/campgrounds/:id/comments/new", checkAuthenticated, function (req, res) {
    cmpground.findById(req.params.id, function (err, foundcmpground) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            res.render("comment/new", { cmpground: foundcmpground, currUser: req.user, currUser: req.user, message: req.flash('message'), success: req.flash('success') });
        }
    })
})

app.post("/campgrounds/:id/comments", checkAuthenticated, function (req, res) {
    cmpground.findById(req.params.id, function (err, foundcmpground) {
        if (err) {
            console.log(err);
            res.redirect("back");
        } else {
            comment.create(req.body.comment, function (err, comment) {
                if (err) {
                    console.log(err);
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();

                    foundcmpground.comments.push(comment);
                    foundcmpground.save();
                    req.flash("success", "comment successfully created!");
                    res.redirect("/campgrounds/" + foundcmpground._id);
                }
            })
        }
    })
})

app.get("/campgrounds/:id/comments/:comment_id/edit", checkCommentOwnership, function (req, res) {
    var cmp_id = req.params.id;
    comment.findById(req.params.comment_id, function (err, foundcomment) {
        if (err) {
            req.flash("message", "something went wrong.");
            res.redirect("/campgrounds/" + req.params.id);
        } else {
            res.render("comment/edit", { currUser: req.user, comment: foundcomment, cmpground_id: cmp_id, currUser: req.user, message: req.flash('message'), success: req.flash('success') });
        }
    })
})

app.put("/campgrounds/:id/comments/:comment_id", checkCommentOwnership, function (req, res) {
    comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, foundcomment) {
        if (err) {
            req.flash("message", "something went wrong.");
            res.redirect("/campgrounds/" + req.params.id);
        } else {
            req.flash("success", "updated successfully!");
            res.redirect("/campgrounds/" + req.params.id);
        }
    })
})

app.delete("/campgrounds/:id/comments/:comment_id", checkCommentOwnership, function (req, res) {
    comment.findByIdAndRemove(req.params.comment_id, function (err, foundcomment) {
        if (err) {
            req.flash("message", "something went wrong.");
            res.redirect("/campgrounds/" + req.params.id);
        } else {
            req.flash("success", "Deleted successfully!");
            res.redirect("/campgrounds/" + req.params.id);
        }
    })
})