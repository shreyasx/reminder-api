var mongoose = require("mongoose");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

var userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			maxlength: 50,
			trim: true,
		},
		username: {
			type: String,
			required: true,
			trim: true,
			unique: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		isVerified: { type: Boolean, required: true, default: false },
		encry_password: {
			type: String,
			required: false,
		},
		salt: String,
	},
	{ timestamps: true }
);

userSchema
	.virtual("password")
	.set(function (password) {
		this._password = password;
		this.salt = uuidv4();
		this.encry_password = this.securePassword(password);
	})
	.get(function () {
		return this._password;
	});

userSchema.methods = {
	authenticate: function (plainpassword) {
		return this.securePassword(plainpassword) === this.encry_password;
	},

	securePassword: function (plainpassword) {
		if (!plainpassword) return "";
		try {
			return crypto
				.createHmac("sha256", this.salt)
				.update(plainpassword)
				.digest("hex");
		} catch (err) {
			return "";
		}
	},
};

module.exports = mongoose.model("User", userSchema);
