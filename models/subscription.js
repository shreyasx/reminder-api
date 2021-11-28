var mongoose = require("mongoose");

var subscriptionSchema = new mongoose.Schema(
	{
		endpoint: {
			type: String,
			required: true,
			unique: true,
		},
		expirationTime: String,
		keys: {
			auth: String,
			p256dh: String,
		},
		user: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
