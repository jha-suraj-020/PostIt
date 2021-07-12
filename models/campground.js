const mongoose = require("mongoose");

// mongoose Schema
var yelcmpSchema = new mongoose.Schema({
    name: String,
    image: String,
    desc: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comment"
        }
    ]
})

module.exports = mongoose.model("cmpground", yelcmpSchema);