const router = require('express').Router();
let User = require('../../db/models/user.model').User;

// Get all products
router.route('/').get((req, res) => {
	User.find()
		.then((user) => res.json(user))
		.catch((err) => res.status(400).json('Error: ' + err));
});

// Get specific user
router.route('/:id').get((req, res) => {
	const id = req.params.id;
	User.findById(id, (err, user) => {
		if (err) res.status(400).json('Error: ' + err);
		res.json(user);
	});
});

// Create new user
router.route('/').post((req, res) => {
	const newUser = new User(req.body);
	newUser
		.save()
		.then(() => res.json('User added.'))
		.catch((err) => res.status(400).json('Error: ' + err));
});

// Update a specific user
router.route('/:id').put(async (req, res) => {
	const id = req.params.id;
	try {
		let updatedUser = await User.findByIdAndUpdate(id, req.body, {
			new: true,
			useFindAndModify: false,
		});
		res.json(updatedUser);
	} catch (err) {
		res.status(400).json('Error: ' + err);
	}
});

// Delete a user
router.route('/:id').delete(async (req, res) => {
	const id = req.params.id;
	try {
		const deletedUser = await User.findByIdAndDelete(id);
		res.json(deletedUser);
	} catch (err) {
		res.status(400).json('Error: ' + err);
	}
});

router.route('/login').get((req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	User.getAuthenticated(username, password, (err, user, reason) => {
		if (err) res.status(404).json(`${reason} : ${err}`);
		res.status(200).json(`User: ${user}`);
	});
});

module.exports = router;
