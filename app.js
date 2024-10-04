const express = require("express");

const app = express();

const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require("path");

const upload = require("./config/multerconfig");

const multer = require("multer");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { log } = require("console");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,"public")))
app.use(cookieParser());


app.get('/', (req, res) =>{
    res.render("index");
})

app.get('/profile/upload', (req, res) =>{
    res.render("profileuploader");
})

app.post('/upload', isLoggedIn, upload.single("image"), async (req, res) =>{
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
})

app.get('/login', (req, res) =>{
    res.render("login");
})

app.get("/profile", isLoggedIn, async (req, res) =>{
    let user = await userModel.findOne({email : req.user.email}).populate("posts");
    
    res.render("profile", { user });
})



app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id}).populate("user"); 

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    
    await post.save()
    res.redirect("/profile");

});


app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id}).populate("user"); 

    res.render("edit", {post})

});


app.post('/update/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({ _id: req.params.id}, {content: req.body.content})

    res.redirect("/profile");

});


app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;

    // Create a new post document in the database
    let post = await postModel.create({
        user: user._id, // Associate the post with the user's ID
        content         // Set the content of the post
    });

    // Add the post's ID to the user's posts array
    user.posts.push(post._id); // Ensure the User schema has a 'posts' array
    await user.save(); // Save the user with the new post reference

    res.redirect("/profile"); // Redirect to the profile page
});




app.post('/register', async (req, res) => {
    let { email, password, username, name, age } = req.body;
    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                email,
                age,
                name, // Ensure name is set here
                password: hash,
            });

            let token = jwt.sign({ email: email, userid: user._id }, "secret123");
            res.cookie("token", token);
            res.send("registered");
        });
    });
});



app.post('/login', async (req, res) => {
    let { email, password } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).send("Something Went Wrong");

    bcrypt.compare(password, user.password, function(err, result) {
        if (result) {
            // Generate token
            let token = jwt.sign({ email: email, userid: user._id }, "secret123");
            
            // Set cookie and send the response together
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        } else {
            res.redirect("/login");
        }
    });
});


app.get('/logout', (req, res) =>{
    res.cookie("token","")
    res.redirect("/login");
})

function isLoggedIn(req, res, next) {
    if (!req.cookies.token) { 
        res.redirect("/login");
    } else {
        try {
            let data = jwt.verify(req.cookies.token, "secret123");
            req.user = data; // Attach user info to request object
            // Log to verify user data from token
            next();  
        } catch (error) {
            // Log the error for debugging
            res.status(401).send("Invalid token. Please login again.");
        }
    }
}



app.listen(3000);