const User = require("../models/user");
const Reminder = require("../models/reminder");
const Todo = require("../models/todo");
const nodemailer = require("nodemailer");
const Token = require("../models/token");
const crypto = require("crypto");
const webpush = require("web-push");
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.NODEMAILER_EMAIL,
		pass: process.env.NODEMAILER_PASS,
	},
});
const publicVapidKey =
	"BHKwbXeFf6VxY3qUuCMArDUI5n-eqDkLWD9s7h1uJnNnSDt9jEL4tdh07Vw596yMYX54ky25yoTlg2gPAczTW1g";
const privateVapidKey = "zON3UYLTAwvlVUGUnrAH1krctzk5Obv-HpYXDOyLIGw";

webpush.setVapidDetails(
	"mailto:test@test.com",
	publicVapidKey,
	privateVapidKey
);

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
		return res.status(400).json({ error: "Account not verified." });
	}
	if (req.body.date < Date.now()) {
		res.json({ error: "Date must be greater than current time." });
		return;
	}
	const time = new Date(req.body.date);
	const currentOffset = time.getTimezoneOffset();
	const ISTOffset = 330;
	const ISTTime = new Date(
		time.getTime() + (ISTOffset + currentOffset) * 60000
	);
	const date = new Intl.DateTimeFormat("en-IN", {
		dateStyle: "long",
		timeStyle: "medium",
	}).format(ISTTime);
	const timeLeft = req.body.date - Date.now();
	const mailOptions = {
		from: process.env.NODEMAILER_EMAIL,
		to: req.profile.email,
		subject: "Your Reminder",
		text:
			`Hey ${req.profile.username},\n\n` +
			"I'm Shreyas, the owner of Reminders & Todos website. You're receiving this mail " +
			"because you had set a reminder on my site.\n" +
			"Title: " +
			req.body.title +
			"\n" +
			"Date: " +
			date +
			"\nYou can reply to this mail for any queries or complaints." +
			"\n\nRegards\nShreyas Jamkhandi",
	};

	const sendMail = () =>
		new Promise((resolve, reject) => {
			transporter.sendMail(mailOptions, function (err, msg) {
				if (err) reject("Send mail error.", err.message);
				else resolve(`Sent a reminder to ${req.profile.username} sucessfully.`);
			});
		});

	const { title, subscription } = req.body;
	console.log(subscription);
	const timeoutID = setTimeout(async () => {
		if (subscription) {
			const title = "REMINDER!";
			const message = req.body.title;
			const payload = JSON.stringify({ title, message });
			await webpush.sendNotification(subscription, payload);
		}
		console.log(await sendMail());
	}, timeLeft);

	const rem = new Reminder({
		title,
		timeoutID,
		date: req.body.date,
		user: req.profile.username,
	});
	rem.save((er, reminder) => {
		if (er) {
			console.log(er);
			res.status(400);
			return;
		}
		res.json(reminder);
	});
};

exports.deleteReminder = (req, res) => {
	Reminder.findOne({ _id: req.params.reminderId }, (error, reminder) => {
		if (error) {
			return res.status(400).json({ error: "No reminder found." });
		}
		clearTimeout(reminder.timeoutID);
		Reminder.deleteOne({ _id: req.params.reminderId })
			.then(res.json("done"))
			.catch(e => {
				console.log(e);
				res.json("error");
			});
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
		const { _id, title, completed } = todo;
		res.json({ _id, title, completed });
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
