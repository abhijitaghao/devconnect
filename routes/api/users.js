const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

router.get("/", (req, res) => {
  res.json({ msg: "get api/users" });
});

//@route    POST api/users/
//@desc     register user
//@access   Public
router.post(
  "/",
  [
    check("name", "please enter the name")
      .not()
      .isEmpty(),
    check("email", "please enter valid email id").isEmail(),
    check("password", "please enter 6 or more charaters").isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { name, email, password } = req.body;
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ mag: "User already exists" }] });
      }

      const avatar = gravatar.url(email, {
        s: "200",
        r: "pg",
        d: "mm"
      });

      const newUser = new User({
        name,
        email,
        avatar,
        password
      });

      const salt = await bcrypt.genSalt(10);
      newUser.password = await bcrypt.hash(password, salt);

      await newUser.save();

      const payload = {
        user: {
          id: newUser.id
        }
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.send({ token });
        }
      );
    } catch (err) {
      return res.status(500).send("server error");
    }
  }
);

module.exports = router;
