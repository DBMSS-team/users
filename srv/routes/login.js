const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const redisTable = require('../constants/constants').redisTables;
const redisFactory = new (require('../libs/redisFactory'))();
let User = require('../../db/models/user.model').User;
require('dotenv').config();

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
	const type = 'access';

	const tokenPayload = { type, userId, role };

	const accessToken = jwt.sign(tokenPayload, JWT_SECRET_KEY, {
		expiresIn: jwtExpirySeconds,
	});
	return accessToken;
}

function genRefreshToken(user) {
	const userId = user.id;
	const role = user.role;
	const type = 'refresh';

	// Also keeping password because if someone else gets refresh token, then it can be changed by changing the password
	const password = user.password;
	const key = genKey(userId, password);

	const tokenPayload = { type, userId, role, key };

	const refreshToken = jwt.sign(tokenPayload, JWT_SECRET_KEY, {
		expiresIn: refreshJwtExpirySeconds,
	});
	return refreshToken;
}

router.post('/refreshToken', async (request, response) => {
	const refreshToken = request.body.refreshToken;

	try {
		const tokenPayload = jwt.verify(refreshToken, JWT_SECRET_KEY);
		if (tokenPayload.type !== 'refresh') throw new Error('wrong token type');

		const userId = tokenPayload.userId;
		const userInDb = await findUserById(userId);
		const password = userInDb.password;

		const keyToCompare = genKey(userId, password);
		if (keyToCompare !== tokenPayload.key) {
			throw new Error('password changed');
		}

		const newAccessToken = genAccessToken(userInDb);
		return newAccessToken;
	} catch (error) {
		response.status(401).send(error.message);
	}
});

// Signup user
router.route('/signup').post(async (req, res) => {
	try {
		const userExists = await User.find({ username: req.body.username });
		if (userExists.length) {
			res.status(400).json('User already exists with this username');
			return;
		}
		const newUser = new User(req.body);
		newUser
			.save()
			.then(() => res.status(200).json('User added.'))
			.catch((err) => res.status(400).json('Error: ' + err));
	} catch (err) {
		res.status(400).json('Error: ' + err);
	}
});

// Login authenticate
router.route('/login').post(async (req, res, next) => {
	const username = req.body.username;
	const password = req.body.password;
	User.getAuthenticated(username, password, (err, user, reason) => {
		if (err) res.status(404).json(`${reason} : ${err}`);
		try {
			const accessToken = genAccessToken(user);
			const refreshToken = genRefreshToken(user);
			const tokenData = {
				accessToken: accessToken,
				refreshToken: refreshToken,
				valid: 'true',
			};
			res.cookie('token', accessToken, { maxAge: jwtExpirySeconds * 1000 });
			res.cookie('refreshToken', refreshToken);
			redisFactory.hmSet(redisTable.TOKEN, user.id, JSON.stringify(tokenData));
			res.status(200).json({ accessToken, refreshToken });
		} catch (err) {
			next(err);
		}
	});
});

router.route('/logout').post((req, res) => {
	const user_data = req.user_data;
	let tokenCurrentUserData = redisFactory.hmGet(redisTable.TOKEN, user_data.id);
	tokenCurrentUserData.valid = 'false';
	redisFactory.hmSet(redisTable, user_data.id, tokenCurrentUserData);
});

module.exports = router;
