const express = require("express");
const router = express.Router();
const webpush = require("web-push");

const { getUserById } = require("../controllers/user");
const { handleSubscribe } = require("../controllers/user");

router.param("username", getUserById);
router.post("/:username", handleSubscribe);

module.exports = router;
