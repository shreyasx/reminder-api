const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const tokenSchema = new mongoose.Schema({
	userId: {
		type: ObjectId,
		ref: "User",
	},
	token: {
		type: String,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now(),
	},
});

module.exports = mongoose.model("Token", tokenSchema);
