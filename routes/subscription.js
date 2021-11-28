const express = require("express");
const router = express.Router();

const { save } = require("../controllers/subscribe");
const { isSignedIn, isAuthenticated } = require("../controllers/auth");
const { getUserById } = require("../controllers/user");

router.param("username", getUserById);
router.post("/:username", isSignedIn, isAuthenticated, save);

module.exports = router;
