const User = require("../models/user");
const { validationResult } = require("express-validator");
var jwt = require("jsonwebtoken");
var expressJwt = require("express-jwt");

exports.signup = (req, res) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).json({
			error: errors.array()[0].msg,
		});
	}

	User.findOne({ username: req.body.username }, (err, u) => {
		if (err) {
			console.log(err);
			return;
		}
		if (u) {
			res.json({ error: "An account with that username already exists." });
			return;
		}
		User.findOne({ email: req.body.email }, (er, us) => {
			if (err) {
				console.log(err);
				return;
			}
			if (u) {
				res.json({ error: "An account with that email already exists." });
				return;
			}
			const user = new User(req.body);
			user.save((error, use) => {
				if (error)
					return res.status(400).json({ error: "Unable to save user in DB." });
				res.json("done");
			});
		});
	});
};

exports.signin = (req, res) => {
	const errors = validationResult(req);

	const { username, password } = req.body;

	if (!errors.isEmpty()) {
		return res.status(422).json({
			error: errors.array()[0].msg,
		});
	}

	User.findOne({ username }, (err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "No account with that username.",
			});
		}

		if (!user.authenticate(password)) {
			return res.status(401).json({
				error: "Email and password do not match",
			});
		}

		//create token
		const token = jwt.sign({ _id: user._id }, process.env.SECRET);

		//send response  to frontend
		const { name, _id, username, email, isVerified } = user;
		return res.json({
			token,
			user: { name, _id, username, email, isVerified },
		});
	});
};

exports.signout = (req, res) => {
	res.clearCookie("token");
	res.json({
		message: "User signout successfully",
	});
};

//protected routes:)
exports.isSignedIn = expressJwt({
	secret: process.env.SECRET,
	userProperty: "auth",
	algorithms: ["HS256"],
});

//custom middlewares
exports.isAuthenticated = (req, res, next) => {
	let checker = req.profile && req.auth && req.profile._id == req.auth._id;
	if (!checker) {
		return res.status(403).json({
			error: "ACCESS DENIED",
		});
	}
	next();
};
