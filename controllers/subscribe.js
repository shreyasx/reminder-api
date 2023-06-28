const Subscription = require("../models/subscription");

exports.save = async (req, res) => {
	try {
		const sub = new Subscription({ ...req.body, user: req.profile.username });
		await sub.save();
		console.log("Saved.");
		res.status(200).end();
	} catch (error) {
		console.log(error);
		console.log("Not saved.");
		res.status(500).end();
	}
};
