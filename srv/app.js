// Global variables declaration for commons submodule
global.__commons = __dirname + "/commons/index";

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { authorization } = require(__commons);
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/user");
const loginRouter = require("./routes/login");
const { logger } = require(__commons);
const appLogger = logger.appLogger;
const errorLogger = logger.errorLogger;

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5008;

const uri = process.env.ATLAS_URI;
mongoose
	.connect(uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true
	})
	.catch(function () {
		errorLogger.error("DB connection error");
	});

const connection = mongoose.connection;
connection.once("open", () => {
	appLogger.info("MongoDB database connection established successfully");
});

logger.use(app);
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(authorization.authorizationMiddleware);
// Attach mongoose connection object as db on each request
app.use((req, res, next) => {
	req.db = connection;
	next();
});
app.use("/users", userRouter);
app.use("/auth", loginRouter);


// Error handler
app.use((err, req, res, next) => {
	if (err) {
		res.status(err.status ? err.status : 500);
		res.json(err.message ? err.message : "Unexpected Error");
	}
});

app.listen(port, () => {
	appLogger.info(`Server is running on port: ${port}`);
});

process.on("exit", (code) => {
	connection.close();
	console.log(`About to exit with code: ${code}`);
});
process.on("SIGINT", function () {
	console.log("Caught interrupt signal");
	process.exit();
});

module.exports = {
	app
};
