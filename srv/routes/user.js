const messages = require("../commons/constants/messages");
const { response } = require("express");

const router = require("express").Router();
const { authorization, ResponseUtils, httpCodes } = require(__commons);
const auth = authorization.authorizationMiddleware;
const responseUtils = new ResponseUtils();
const User = require("../../db/models/user.model").User;

router.use(auth);

// Get all users
router.route("/").get((req, res) => {
	User.find()
		.then((user) => responseUtils.setSuccess(httpCodes.OK, messages.USERS_FETCHED, user)
			.send(res))
		.catch((err) => responseUtils.setError(httpCodes.NOT_FOUND, err.message).send(res));
});

// Get specific user
router.get("/:id", (req, res) => {
	const id = req.params.id;
	User.findById(id, (err, user) => {
		if (err) responseUtils.setError(httpCodes.NOT_FOUND, err.message).send(res);
		responseUtils.setSuccess(httpCodes.OK, messages.USERS_FETCHED, user).send(res);
	});
});

// Create new user
router.post("/", async (req, res) => {
	try {
		const userExists = await User.find({
			username: req.body.username
		});
		if (userExists.length) {
			res.setError(httpCodes.NOT_FOUND, messages.USER_EXISTS).send(res);
			return;
		}
		const newUser = new User(req.body);
		newUser
			.save()
			.then(() => responseUtils.setSuccess(httpCodes.OK, messages.USER_CREATED, newUser)
				.send(res))
			.catch((err) => responseUtils.setError(httpCodes.DB_ERROR, err.message).send(res));
	} catch (err) {
		responseUtils.setError(httpCodes.INTERNAL_SERVER_ERROR, err.message).send(res);
	}
});

// Update a specific user
router.put("/:id", async (req, res) => {
	const id = req.params.id;
	try {
		const updatedUser = await User.findByIdAndUpdate(id, req.body, {
			"new": true,
			useFindAndModify: false
		});
		responseUtils.setSuccess(httpCodes.OK, USER_UPDATED, updatedUser).send(res);
	} catch (err) {
		responseUtils.setError(httpCodes.DB_ERROR, err.message).send(res);
	}
});

// Delete a user
router.delete("/:id", async (req, res, next) => {
	const id = req.params.id;
	try {
		const deletedUser = await User.findByIdAndDelete(id);
		responseUtils.setSuccess(httpCodes.OK, messages.USER_DELETED, deletedUser).send(res);
	} catch (err) {
		if (err.status) {
			next(err);
		}
		responseUtils.setError(httpCodes.DB_ERROR, err.message).send(res);
	}
});

module.exports = router;
