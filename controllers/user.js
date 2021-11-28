const User = require("../models/user");
const Reminder = require("../models/reminder");
const Todo = require("../models/todo");
const nodemailer = require("nodemailer");
const Token = require("../models/token");
const crypto = require("crypto");
const webpush = require("web-push");
const Subscription = require("../models/subscription");
const transporter = nodemailer.createTransport({
	service: "Gmail",
	auth: {
		user: process.env.NODEMAILER_EMAIL,
		pass: process.env.NODEMAILER_PASS,
	},
});
const publicVapidKey =
	"BHKwbXeFf6VxY3qUuCMArDUI5n-eqDkLWD9s7h1uJnNnSDt9jEL4tdh07Vw596yMYX54ky25yoTlg2gPAczTW1g";
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

var _jade = require("jade");
var fs = require("fs");

webpush.setVapidDetails(
	"mailto:shreyxs@gmil.com",
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
	if (req.body.date < Date.now() + 10000) {
		res.json({ error: "Can't set a reminder in the past, eh? :-/" });
		return;
	}
	// if (!req.body.subscription && !req.body.sendEmail)
	// 	return res
	// 		.status(400)
	// 		.json({ error: "No notification and email permission." });
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

	const timeoutID = setTimeout(async () => {
		// if (req.body.subscription) {
		// 	const title = "REMINDER!";
		// 	const message = req.body.title;
		// 	const payload = JSON.stringify({ title, message });
		// 	try {
		// 		await webpush.sendNotification(req.body.subscription, payload);
		// 		console.log(`Sent notification to ${req.profile.username}.`);
		// 	} catch (err) {
		// 		console.log("Notification error.", err);
		// 	}
		// }

		const subs = await Subscription.find({ user: req.profile.username }).exec();
		const title = "REMINDER!";
		const message = req.body.title;
		const payload = JSON.stringify({ title, message });
		try {
			subs.map(async sub => {
				console.log(`sending to ${sub.endpoint}`);
				await webpush.sendNotification(sub, payload);
			});
			console.log(`Sent notification to ${req.profile.username}.`);
		} catch (err) {
			console.log("Notification error.", err);
		}

		if (req.body.sendEmail) {
			var template = process.cwd() + "/views/reminder.jade";
			fs.readFile(template, "utf8", async function (err, file) {
				if (err) {
					console.log("ERROR!", err);
				} else {
					var compiledTmpl = _jade.compile(file, { filename: template });
					var context = { name: req.profile.name, title: req.body.title, date };
					var html = compiledTmpl(context);
					try {
						await sendMail(
							req.profile.email,
							"Reminder from Reminders & Todos Co.",
							html
						);
					} catch (err) {
						console.log(err);
					}
				}
			});
		}
		await deleteOldReminders();
	}, timeLeft);

	const rem = new Reminder({
		title: req.body.title,
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
		if (error || !reminder)
			return res.status(400).json({ error: "No reminder found." });
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

exports.verify = async (req, res) => {
	const user = await User.findOne({ username: req.profile.username });
	if (!user) return res.status(400).json({ error: "No user" });
	var template = process.cwd() + "/views/verification.jade";
	fs.readFile(template, "utf8", async function (err, file) {
		if (err) {
			console.log("ERROR!", err);
			return res.status(400).end();
		} else {
			var compiledTmpl = _jade.compile(file, { filename: template });
			var context = { name: user.name, token: createToken(user._id) };
			var html = compiledTmpl(context);
			try {
				await sendMail(user.email, "Account Verification Link", html);
				res.status(200).json(true);
			} catch (err) {
				console.log(err);
				res.status(400).end();
			}
		}
	});
};

exports.confirmationPost = (req, res, next) => {
	const tok = req.body.token;
	Token.findOne({ token: tok }, function (err, token) {
		if (!token) return res.json({ message: "Invalid token." });
		if (Date.parse(token.createdAt) + 1800000 < Date.now())
			return res.json({ message: "Token expired." });

		User.findOne({ _id: token.userId }, function (e, user) {
			if (!user) return res.json({ message: "Invalid token." });
			if (user.isVerified)
				return res.json({ message: "User already verified." });

			user.isVerified = true;
			user.save(function (er) {
				if (er) return res.json({ message: er.message });
				console.log(`${user.name} - Verified.`);
				res.json({ message: "done" });
			});
		});
	});
};

exports.isVerified = (req, res) => {
	res.json(req.profile.isVerified);
};

const sendMail = (to, subject, content) => {
	return new Promise((resolve, reject) => {
		var mailOptions = {
			from: `Shreyas Jamkhandi <${process.env.NODEMAILER_EMAIL}>`,
			to,
			subject: subject,
			html: content,
		};
		transporter.sendMail(mailOptions, (err, msg) => {
			if (err) reject(err.message);
			else resolve(`Sent mail to ${to}`);
		});
	});
};

const deleteOldReminders = async () => {
	const del = await Reminder.deleteMany({ date: { $lt: Date.now() } });
	console.log(`Deleted ${del.deletedCount} old reminders.`);
};
