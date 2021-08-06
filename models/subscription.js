var mongoose = require("mongoose");

var subscriptionSchema = new mongoose.Schema(
	{
		subscription: {
			endpoint: { type: String, required: true },
			expirationTime: {},
			keys: { type: Object, required: true },
		},
		user: {
			type: String,
			required: true,
			trim: true,
		},
		completed: { type: Boolean, default: false, required: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
