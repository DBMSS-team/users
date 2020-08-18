const mongoose = require('mongoose');
const uuid = require('node-uuid');

const Schema = mongoose.Schema;

// Todo: add comments where required as defined in addressSchema
// Todo: Optimize the types and filters on them
// Todo: Perform validations wherever possible
let addressSchema = new Schema({
	address_id: {
		type: String,
		default: function genUUID() {
			uuid.v1();
		},
	},
	line_1: { type: String, required: [true, 'Insert line 1'] },
	line_2: { type: String },
	city: { type: String, required: [true, 'Insert city'] },
	state: { type: String, required: [true, 'Insert state'] },
	country: { type: String, required: [true, 'Insert country'] },
	pin_code: { type: Number, required: [true, 'Insert pin code'] },
});

let cardSchema = new Schema({
	card_id: {
		type: String,
		default: function genUUID() {
			uuid.v1();
		},
	},
	card_no: { type: String, required: true }, // Todo: Store hash and show only last 4 digit
	card_holder_name: { type: String, required: true },
	expiry_date: {
		type: Date,
		required: true,
		validate: {
			validator: function (v) {
				return /\d{2}\/\d{4}/.test(v);
			},
		},
	},
});

let userSchema = new Schema(
	{
		username: {
			type: String,
			unique: true,
			required: true,
			index: { unique: true },
		},
		phone_number: { type: Number, required: true },
		email: { type: String, required: true },
		user_category: {
			type: String,
			default: 'Normal',
			text: 'Normal and Premium',
		}, // 2 types: Normal and Premium
		wallet_id: { type: String },
		user_addresses: [addressSchema],
		cards: [cardSchema],
	},
	{
		timestamps: true,
	}
);

const User = mongoose.model('User', userSchema);

module.exports = { User, addressSchema };
