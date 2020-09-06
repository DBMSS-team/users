global.__commons = __dirname + "/../srv/commons";
const mongoose = require("mongoose");
const UserModel = require("../db/models/user.model").User;
const userData = {
	username: "Sahil",
	password: "Sahil",
	email: "kumarsahil129@gmail.com",
	userCategory: "Premium"
};

describe("User model test", () => {
	// Connect to mongoDB
	UserModel.beforeAll(async () => {
		await mongoose.connect(
			global.__MONGO_URI__,
			{
				useNewUrlParser: true, useCreateIndex: true
			},
			(err) => {
				if (err) {
					console.error(err);
					process.exit(1);
				}
			}
		);
	});

	test("create and save user", async () => {
		const validUser = new UserModel(userData);
		const savedUser = await validUser.save();
		// Object Id should be defined when successfully saved to MongoDB.
		expect(savedUser._id).toBeDefined();
		expect(savedUser.username).toBe(userData.username);
		expect(savedUser.email).toBe(userData.email);
		expect(savedUser.user_category).toBe(userData.user_category);
	});

	test("check if the existing user is authenticated", async () => {
		const validUser = new UserModel({
			username: userData.username,
			password: userData.password
		});
		validUser.getAuthenticated((err, user, reason) => {
			expect(err).toBeUndefined();
			expect(validUser.username).toBe(user.username);
		});
	});

	test("check if the incorrect user is not authenticated", async () => {
		const validUser = new UserModel({
			username: "WrongUserAbcd",
			password: "abcdefgh"
		});
		validUser.getAuthenticated((err, user, reason) => {
			expect(err).toBeDefined();
		});
	});

	UserModel.afterAll();
});
