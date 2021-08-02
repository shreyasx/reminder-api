var express = require("express");
var router = express.Router();

const { check } = require("express-validator");
const { signout, signup, signin } = require("../controllers/auth");

router.post(
	"/signup",
	[
		check("name")
			.isLength({ min: 3 })
			.withMessage("Name must be at least 3 characters long."),
		check("username")
			.isLength({ min: 3 })
			.withMessage("Username must be at least 3 characters long.")
			.isString()
			.withMessage("Enter valid username."),
		check("email", "Enter a valid email address.").isEmail(),
		check("password", "Password must be atleast 5 characters long.").isLength({
			min: 5,
		}),
	],
	signup
);

router.post(
	"/signin",
	[
		check("username").not().isEmpty().withMessage("Username cannot be empty."),
		check("password").not().isEmpty().withMessage("Password cannot be empty."),
	],
	signin
);

router.get("/signout", signout);

module.exports = router;
