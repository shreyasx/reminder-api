require("dotenv").config();
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");

var app = express();

app.use(cors());
app.use(logger("dev"));
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
const subscribeRoute = require("./routes/push");

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/subscribe", subscribeRoute);

app.get("/", (req, res) => res.send("<h1>Backend for the reminder app.</h1>"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}.`));
