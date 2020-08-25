const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

function getAccessTokenFromHeader(req) {
	return req.headers.authorization || req.cookies.auth;
}

async function authorizationMiddleware(request, response, nextHandler) {
	const accessToken = getAccessTokenFromHeader(request);
	try {
		if (accessToken) {
			const tokenPayload = await jwt.verify(accessToken, JWT_SECRET_KEY);
			if (tokenPayload.type !== 'access') throw new Error('Wrong token type');

			response.user_data = tokenPayload;
		}
		nextHandler();
	} catch (error) {
		response.status(401).send(error.message);
	}
}

module.exports = { authorizationMiddleware, getAccessTokenFromHeader };
