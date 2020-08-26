const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authorization = require('./middlewares/authorization');
const cookieParser = require('cookie-parser');
const userRouter = require('./routes/user');
const loginRouter = require('./routes/login');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5008;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(authorization.authorizationMiddleware);

const uri = process.env.ATLAS_URI;
mongoose
	.connect(uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		createIndexes: true,
	})
	.catch(function () {
		console.log('DB connection error');
	});

const connection = mongoose.connection;
connection.once('open', () => {
	console.log(`MongoDB database connection established successfully`);
});

app.use('/users', userRouter);
app.use('/auth', loginRouter);

//Error handler
app.use((err, req, res, next) => {
	if (err) {
		res.status(err.status ? err.status : 500);
		res.json(err.message ? err.message : 'Error');
	}
});

app.listen(port, () => {
	console.log(`Server is running on port: ${port}`);
});

module.exports = { app };
