var mongoose = require("mongoose");

var reminderSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},
		timeoutID: { type: Number, required: true },
		user: {
			type: String,
			required: true,
			trim: true,
		},
		date: { type: Date, required: true },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);
