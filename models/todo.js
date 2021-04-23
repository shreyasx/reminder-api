var mongoose = require("mongoose");

var todoSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
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

module.exports = mongoose.model("Todo", todoSchema);
