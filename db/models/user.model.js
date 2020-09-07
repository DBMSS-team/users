const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
// eslint-disable-next-line no-undef
const { messages } = require(__commons);

const SALT_FACTOR = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000;

const Schema = mongoose.Schema;

// Todo: add comments where required as defined in addressSchema
// Todo: Optimize the types and filters on them
// Todo: Perform validations wherever possible
const addressSchema = new Schema({
	line1: {
		type: String, required: [true, "Insert line 1"]
	},
	line2: {
		type: String
	},
	city: {
		type: String, required: [true, "Insert city"]
	},
	state: {
		type: String, required: [true, "Insert state"]
	},
	country: {
		type: String, required: [true, "Insert country"]
	},
	pinCode: {
		type: Number, required: [true, "Insert pin code"]
	}
});

const cardSchema = new Schema({
	cardNo: {
		type: String, required: true
	}, // Todo: Store hash and show only last 4 digit
	cardHolderName: {
		type: String, required: true
	},
	expiryDate: {
		type: Date,
		required: true,
		validate: {
			validator: function (v) {
				return /\d{2}\/\d{4}/.test(v);
			}
		}
	}
});

const userSchema = new Schema(
	{
		username: {
			type: String,
			unique: true,
			required: true,
			index: {
				unique: true
			}
		},
		password: {
			type: String, required: true
		},
		loginAttempts: {
			type: Number, "default": 0
		},
		lockUntil: {
			type: Number
		},
		phoneNumber: {
			type: Number,
			required: true,
			unique: true,
			dropDups: true
		},
		email: {
			type: String, required: true, unique: true, dropDups: true
		},
		userCategory: {
			type: String,
			"default": "Normal",
			text: "Normal and Premium"
		}, // 2 types: Normal and Premium
		role: [{
			type: String
		}],
		walletId: {
			type: String
		},
		userAddresses: [addressSchema],
		cards: [cardSchema],
		cartId: {
			type: String
		}
	},
	{
		timestamps: true
	}
);

// Check for future lock
userSchema.virtual("isLocked").get(function () {
	return this.lockUntil && this.lockUntil > Date.now();
});

// Middleware before saving user
userSchema.pre("save", async function (next) {
	try {
		const that = this;

		// Only hash the password if it is new or modified
		if (!that.isModified("password")) { return next(); }

		// Generate a salt
		const salt = await bcrypt.genSalt(SALT_FACTOR);
		const hash = await bcrypt.hash(that.password, salt);
		that.password = hash;
		next();
	} catch (err) {
		next(err);
	}
});

// Compare password
userSchema.methods.comparePassword = function (password) {
	return new Promise((resolve, reject) => {
		bcrypt
			.compare(password, this.password)
			.then((isMatch) => resolve(isMatch))
			.catch((err) => reject(err));
	});
};

// Check the login attempts
userSchema.methods.incLoginAttempts = function (cb) {
	// If we have a previous lock that has expired restart at 1
	if (this.lockUntil && this.lockUntil < Date.now()) {
		return this.update(
			{
				$set: {
					loginAttempts: 1,
					lockUntil: 1
				}
			},
			cb
		);
	}

	// Otherwise increment the loginAttempts
	const updates = {
		$inc: {
			loginAttempts: 1
		}
	};
	// Lock the account if reached max limit if not locked already
	if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
		updates.$set = {
			lockUntil: Date.now() + LOCK_TIME
		};
	}

	return this.update(updates, cb);
};

/**
 * Check if user is authenticated
 * @param {username} Name of the user entered
 * @param {password} Password of the user entered
 * @param {cb} Callback (err, user, error_reason)
 */
userSchema.statics.getAuthenticated = async function (username, password, cb) {
	try {
		const user = await this.findOne({
			username: username
		});

		if (!user) {
			return cb(null, null, messages.NO_USER_FOUND);
		}

		// Check if the user is currently locked
		if (user.isLocked) {
			return cb(null, null, messages.USER_LOCKED);
		}

		// Test for matching password
		const isMatch = await user
			.comparePassword(password)
			.catch((err) => cb(err, null, messages.INCORRECT_PASSWORD));

		if (isMatch) {
			if (!user.loginAttempts && !user.lockUntil) {
				return cb(null, user);
			}

			// Reset attempts and lock info
			const updates = {
				$set: {
					loginAttempts: 0,
					lockUntil: 0
				}
			};

			return user.update(updates, (err) => {
				if (err) { return cb(err, null); }
				return cb(null, user);
			});
		}

		// password is incorrect, so increment the login attempts
		user.incLoginAttempts((err) => {
			if (err) { cb(err, null); }
			return cb(null, null, messages.MAX_ATTEMPTS_EXCEEDED);
		});
	} catch (err) {
		return cb(err);
	}
};

const User = mongoose.model("User", userSchema);

module.exports = {
	User, addressSchema
};
