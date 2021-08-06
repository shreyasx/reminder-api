const express = require("express");
const router = express.Router();
const webpush = require("web-push");

const { getUserById } = require("../controllers/user");
const { handleSubscribe } = require("../controllers/user");
const Subscription = require("../models/subscription");

router.param("username", getUserById);
router.post("/:username", handleSubscribe);

router.get("/test/:username", async (req, res) => {
	try {
		const subscription = await Subscription.findOne({
			user: req.profile.username,
		});
		if (subscription) {
			console.log(`Subscription found for ${req.profile.username}`);
			const title = "PUSH PUSH";
			const message = "You asked for it";
			const payload = JSON.stringify({ title, message });
			await webpush.sendNotification(subscription.subscription, payload);
			return res.status(200).end();
		}
		res.status(400).end();
	} catch (error) {
		res.status(400).end();
		console.log(error);
	}
});

module.exports = router;
