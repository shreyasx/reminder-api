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
		const subscriptions = await Subscription.find({
			user: req.profile.username,
		});
		if (subscriptions.length > 0) {
			subscriptions.map(async subs => {
				try {
					const title = "REMINDER!";
					const message = req.body.title;
					const payload = JSON.stringify({ title, message });
					await webpush.sendNotification(subs.subscription, payload);
					console.log(
						`Subscription found for ${req.profile.username}. Notified.`
					);
				} catch (error) {
					console.log(error);
				}
			});
			res.status(200).end();
		} else {
			console.log(`No subscription found for ${req.profile.username}.`);
			res.status(400).end();
		}
	} catch (error) {
		console.log(error);
		res.status(400).end();
	}
});

module.exports = router;
