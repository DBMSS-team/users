const router = require('express').Router();
let User = require('../../db/models/user.model').User;

// Get all users
router.route('/').get((req, res) => {
	User.find()
		.then((user) => res.json(user))
		.catch((err) => res.status(400).json('Error: ' + err));
});

// Get specific user
router.get('/:id', (req, res) => {
	const id = req.params.id;
	User.findById(id, (err, user) => {
		if (err) res.status(400).json('Error: ' + err);
		res.json(user);
	});
});

// Create new user
router.post('/', async (req, res) => {
	try {
		const userExists = await User.find({ username: req.body.username });
		if (userExists.length) {
			res.status(400).json('User already exists with this username');
			return;
		}
		const newUser = new User(req.body);
		newUser
			.save()
			.then(() => res.json('User added.'))
			.catch((err) => res.status(400).json('Error: ' + err));
	} catch (err) {
		res.status(400).json('Error: ' + err);
	}
});

// Update a specific user
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res, next) => {
	if (req.body.role === 'ADMIN') {
		const id = req.params.id;
		try {
			const deletedUser = await User.findByIdAndDelete(id);
			res.json(deletedUser);
		} catch (err) {
			if (err.status) {
				next(err);
			}
			res.status(400).json('Error: ' + err);
		}
	} else {
		res.status(404).json(new Error('Not Authorized'));
	}
});

module.exports = router;
