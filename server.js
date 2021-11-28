require("dotenv").config();
var express = require("express");
var cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cors = require("cors");

var app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

mongoose
	.connect(process.env.DATABASE, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
		useFindAndModify: false,
	})
	.then(() => console.log("MongoDB connected."));

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

app.use("/auth", authRoutes);
app.use("/user", userRoutes);

app.get("/", (req, res) => res.json({ message: "Hello, have a great day!" }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Listening on port ${PORT}.`));
