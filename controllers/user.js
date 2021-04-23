const User = require("../models/user");
const Reminder = require("../models/reminder");
const Todo = require("../models/todo");
const nodemailer = require("nodemailer");
const Token = require("../models/Token");
const crypto = require("crypto");
const { log } = require("console");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.NODEMAILER_EMAIL,
		pass: process.env.NODEMAILER_PASS,
	},
});

exports.getUserById = (req, res, next, id) => {
	User.findOne({ username: req.params.username }, (err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "No user was found in DB",
			});
		}
		req.profile = user;
		next();
	});
};

exports.addReminder = (req, res) => {
	if (req.profile.isVerified !== true) {
		res.status(400).json({ error: "Account not verified." });
	}
	if (req.body.date < Date.now()) {
		res.json("Date must be greater than current time.");
		return;
	}
	const rem = new Reminder(req.body);
	rem.save((er, reminder) => {
		if (er) {
			console.log(er);
			res.status(400);
			return;
		}
		const { title } = reminder;
		res.json({ title });
		setTimer(reminder, req.profile);
	});
};

exports.deleteReminder = (req, res) => {
	Reminder.deleteOne({ _id: req.params.reminderId })
		.then(res.json("done"))
		.catch(e => {
			console.log(e);
			res.json("error");
		});
};

exports.allReminders = (req, res) => {
	Reminder.find({ user: req.profile.username }, (er, reminders) => {
		if (er) {
			console.log(er);
			res.json(er);
			return;
		}
		const response = reminders.map(reminder => {
			const { title, date, _id } = reminder;
			return { title, date, _id };
		});
		res.json(response);
	});
};

exports.addTodo = (req, res) => {
	const { title } = req.body;
	const todo = new Todo({ title, user: req.profile.username });
	todo.save((er, todo) => {
		if (er) {
			console.log(er);
			res.json(er);
			return;
		}
		const { title } = todo;
		res.json({ title });
	});
};

exports.allTodos = (req, res) => {
	Todo.find({ user: req.profile.username }, (er, todos) => {
		if (er) {
			console.log(er);
			res.json("error");
			return;
		}
		const response = todos.map(todo => {
			const { _id, title, completed } = todo;
			return { _id, title, completed };
		});
		res.json(response);
	});
};

exports.deleteTodo = (req, res) => {
	Todo.deleteOne({ _id: req.params.todoId })
		.then(res.json("done"))
		.catch(e => {
			console.log(e);
			res.json("error");
		});
};

exports.updateTodo = (req, res) => {
	Todo.findOne({ _id: req.params.todoId }, (er, todo) => {
		if (er || !todo) {
			if (er) console.log(er);
			return res.json("error");
		}
		todo.completed = !todo.completed;
		todo.save((err, tod) => {
			if (err || !tod) return res.json("error");
			res.json("done");
		});
	});
};

const setTimer = (reminder, profile) => {
	const date = new Date(reminder.date).toString().split(" GMT")[0];
	const timeLeft = Date.parse(reminder.date) - Date.now();
	const mailOptions = {
		from: process.env.NODEMAILER_EMAIL,
		to: profile.email,
		subject: "Your Reminder",
		text:
			`Hey ${profile.username},\n\n` +
			"I'm Shreyas, the owner of Reminders & Todos website. You're receiving this mail " +
			"because you had set a reminder on my site.\n" +
			"Title: " +
			reminder.title +
			"\n" +
			"Date: " +
			date +
			"\nYou can reply to this mail for any queries or complaints." +
			"\n\nRegards\nShreyas Jamkhandi",
	};

	const sendMail = () => {
		transporter.sendMail(mailOptions, function (err, msg) {
			if (err) console.log("Send mail error -", err.message);
			else {
				console.log(`Sent a reminder to ${profile.username} sucessfully.`);
				Reminder.deleteOne({ _id: reminder._id }).catch(console.log);
			}
		});
	};

	setTimeout(sendMail, timeLeft);
};

const createToken = userID => {
	const tokenS = new Token({
		userId: userID,
		token: crypto.randomBytes(16).toString("hex"),
	});
	tokenS.save((err, response) => {
		if (err) {
			console.log("unable to save token in db.");
			return;
		}
	});
	return tokenS.token;
};

exports.verify = (req, res) => {
	User.findOne({ username: req.profile.username }, (er, user) => {
		const mailOptions = {
			from: process.env.NODEMAILER_EMAIL,
			to: user.email,
			subject: "Account Verification Token",
			text:
				`Hey ${user.name},\n\n` +
				"I'm Shreyas, the owner of Reminders & Todos website. If you didn't " +
				"create an account on my website, please ignore this mail.\n" +
				"However, if you did, you can verify your account by clicking the link: \n" +
				process.env.CLIENT +
				"verify/" +
				createToken(user._id) +
				"\nYou can reply to this mail for any queries." +
				"\n\nRegards\nShreyas Jamkhandi",
		};
		transporter.sendMail(mailOptions, function (err, msg) {
			if (err) {
				console.log("send mail error -", err.message);
				res.json({ error: "Couldn't send mail to your address." });
			} else {
				console.log(
					`Sent account verification email to ${user.email} sucessfully.`
				);
				res.json("Sent mail");
			}
		});
	});
};

exports.confirmationPost = (req, res, next) => {
	const tok = req.body.token;
	Token.findOne({ token: tok }, function (err, token) {
		if (!token) return res.json({ error: "Invalid token" });
		if (token.createdAt + 1800000 < Date.now())
			return res.json({ error: "Token expired" });

		User.findOne({ _id: token.userId }, function (e, user) {
			if (!user) return res.json({ error: "Invalid token" });
			if (user.isVerified)
				return res.json({
					error: "This user has already been verified.",
				});

			// Verify and save the user
			user.isVerified = true;
			user.save(function (er) {
				if (er) return res.json({ error: err.message });
				console.log(`${user.name} - Verified.`);
				res.json(true);
				Token.deleteOne({ token: tok }).then(console.log("Deleted token."));
			});
		});
	});
};

exports.isVerified = (req, res) => {
	res.json(req.profile.isVerified);
};
