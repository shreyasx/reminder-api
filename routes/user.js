const express = require("express");
const router = express.Router();

const {
	getUserById,
	addReminder,
	allReminders,
	addTodo,
	allTodos,
	deleteTodo,
	updateTodo,
	confirmationPost,
	verify,
	isVerified,
} = require("../controllers/user");
const { isSignedIn, isAuthenticated } = require("../controllers/auth");

router.param("username", getUserById);

router.get(
	"/:username/delete/todo/:todoId",
	isSignedIn,
	isAuthenticated,
	deleteTodo
);

router.get(
	"/:username/update/todo/:todoId",
	isSignedIn,
	isAuthenticated,
	updateTodo
);

router.get("/:username/reminders", isSignedIn, isAuthenticated, allReminders);

router.get("/:username/todos", isSignedIn, isAuthenticated, allTodos);

router.post(
	"/:username/add/reminder",
	isSignedIn,
	isAuthenticated,
	addReminder
);

router.get("/verify/:username", isSignedIn, isAuthenticated, verify);

router.post("/verify-email", confirmationPost);

router.get("/:username/isVerified", isSignedIn, isAuthenticated, isVerified);

router.post("/:username/add/todo", isSignedIn, isAuthenticated, addTodo);

module.exports = router;
