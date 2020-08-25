const router = require('express').Router();
const jwt = require('jsonwebtoken');
let User = require('../../db/models/user.model').User;
const jwtExpirySeconds = 15 * 60;

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

	const refreshToken = jwt.sign(tokenPayload, JWT_SECRET_KEY);
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
		response.status(200).json({ newAccessToken });
	} catch (error) {
		response.status(401).send(error.message);
	}
});

// Login authenticate
router.route('/login').post(async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	User.getAuthenticated(username, password, (err, user, reason) => {
		if (err) res.status(404).json(`${reason} : ${err}`);
		const accessToken = genAccessToken(user);
		const refreshToken = genRefreshToken(user);
		response.cookie('token', token, { maxAge: jwtExpirySeconds * 1000 });
		response.status(200).json({ accessToken, refreshToken });
	});
});

module.exports = router;
