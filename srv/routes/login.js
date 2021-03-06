const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { messages, redisTables, RedisFactory, httpCodes } = require(__commons);
const ResponseUtils = new (require(__commons).ResponseUtils)();
const User = require("../../db/models/user.model").User;
require("dotenv").config();

const SALT_FACTOR = 10;
const jwtExpirySeconds = 15 * 60;
const refreshJwtExpirySeconds = 7 * 24 * 60 * 60;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

async function genKey(id, password) {
	const rawKey = id + password;
	const salt = await bcrypt.genSalt(SALT_FACTOR);
	const hash = await bcrypt.hash(rawKey, salt);
	return hash;
}

function genAccessToken(user) {
	const userId = user.id;
	const role = user.role;
	const type = "access";

	const tokenPayload = {
		type, userId, role
	};

	const accessToken = jwt.sign(tokenPayload, JWT_SECRET_KEY, {
		expiresIn: jwtExpirySeconds
	});
	return accessToken;
}

function genRefreshToken(user) {
	const userId = user.id;
	const role = user.role;
	const type = "refresh";

	// Also keeping password because if someone else gets refresh token,
	// then it can be changed by changing the password
	const password = user.password;
	const key = genKey(userId, password);

	const tokenPayload = {
		type, userId, role, key
	};

	const refreshToken = jwt.sign(tokenPayload, JWT_SECRET_KEY, {
		expiresIn: refreshJwtExpirySeconds
	});
	return refreshToken;
}

router.post("/refreshToken", async (request, response) => {
	const refreshToken = request.body.refreshToken;

	try {
		jwt.verify(refreshToken, JWT_SECRET_KEY, async (err, tokenPayload) => {
			if (err) {
				ResponseUtils.setError(httpCodes.FORBIDDEN, [messages.INVALID_TOKEN, err.message]);
			}
			if (tokenPayload.type !== "refresh") {
				ResponseUtils.setError(
					httpCodes.FORBIDDEN,
					[messages.REFRESH_TOKEN_NOT_FOUND, err.message]
				);
			}
			const userId = tokenPayload.userId;
			const userInDb = await User.findUserById(userId);
			const password = userInDb.password;

			const keyToCompare = genKey(userId, password);
			if (keyToCompare !== tokenPayload.key) {
				throw new Error(messages.PASSWORD_CHANGED);
			}

			const newAccessToken = genAccessToken(userInDb);
			return newAccessToken;
		});
	} catch (error) {
		ResponseUtils
			.setError(httpCodes.INTERNAL_SERVER_ERROR, error.message)
			.send(response);
	}
});

// Signup user
router.route("/signup").post(async (req, res) => {
	try {
		const userExists = await User.find({
			username: req.body.username
		});
		if (userExists.length) {
			ResponseUtils.setError(httpCodes.INVALID_PARAMS, messages.USER_EXISTS);
			return;
		}
		const newUser = new User(req.body);
		newUser
			.save()
			.then((user) => {
				ResponseUtils
					.setSuccess(httpCodes.CREATED, messages.USER_CREATED, user)
					.send(res);
			})
			.catch((err) => {
				ResponseUtils.setError(httpCodes.DB_ERROR, err.message).send(res);
			});
	} catch (err) {
		ResponseUtils
			.setError(httpCodes.INTERNAL_SERVER_ERROR, err.message)
			.send(res);
	}
});

// Login authenticate
router.route("/login").post(async (req, res, next) => {
	const username = req.body.username;
	const password = req.body.password;
	User.getAuthenticated(username, password, (err, user, reason) => {
		if (err) {
			next(err);
			return;
		}
		if (reason) {
			ResponseUtils.setError(httpCodes.UNAUTHORIZED, reason).send(res);
			return;
		}
		try {
			const accessToken = genAccessToken(user);
			const refreshToken = genRefreshToken(user);
			const tokenData = {
				accessToken: accessToken,
				refreshToken: refreshToken,
				valid: "true"
			};
			res.cookie("token", accessToken, {
				maxAge: jwtExpirySeconds * 1000
			});
			res.cookie("refreshToken", refreshToken);
			RedisFactory.hmSet(redisTables.TOKEN, user.id, JSON.stringify(tokenData));
			ResponseUtils
				.setSuccess(httpCodes.OK, messages.USER_LOGIN_SUCCESS, tokenData)
				.send(res);
		} catch (err) {
			next(err);
		}
	});
});

router.route("/logout").post(async (req) => {
	const userData = req.body;
	const tokenCurrentUserData = await RedisFactory.hmGet(
		redisTables.TOKEN,
		userData.id
	);
	tokenCurrentUserData.valid = "false";
	RedisFactory.hmSet(redisTables.TOKEN, userData.id, JSON.stringify(tokenCurrentUserData));
});

module.exports = router;
