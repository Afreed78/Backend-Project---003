const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user" // Make sure this matches the actual User model name
    },
    date: {
        type: Date,
        default: Date.now
    },
    content: String,
    likes: [
        { type: mongoose.Schema.Types.ObjectId, ref: "user" }
    ]
});

module.exports = mongoose.model('post', postSchema); // Ensure model name is capitalized
