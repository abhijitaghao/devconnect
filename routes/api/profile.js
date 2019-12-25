const express = require("express");
const router = express.Router();
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const auth = require("../../middleware/auth");
const request = require("request");
const config = require("config");
const { check, validationResult } = require("express-validator");

//@route    GET api/profile
//@desc     Get all profile
//@access   Public
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);
    if (!profiles) {
      return res.status(400).json({ msg: "No profiles found" });
    }
    return res.json(profiles);
  } catch (err) {
    console.log(err.message);
    return res.status(500).send("Server Error");
  }
});

//@route    GET api/profile/me
//@desc     Get current users profile
//@access   Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id
    }).populate("user", ["name", "avatar"]);
    if (!profile) {
      res.status(400).json({ msg: "No profile for this user" });
    }
    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

//@route    GET api/profile/user/:user_id
//@desc     Get all profile
//@access   Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate("user", ["name", "avatar"]);
    if (!profile) {
      return res.status(400).json({ msg: "No profile for this user" });
    }
    return res.json(profile);
  } catch (err) {
    console.log(err.message);
    if (err.kind == "ObjectId")
      return res.status(400).json({ msg: "Profile not found" });
    return res.status(500).send("Server Error");
  }
});

//@route    POST api/profile
//@desc     Add or Update user profile
//@access   Private
router.post(
  "/",
  [
    auth,
    [
      check("skills", "Skills are required")
        .not()
        .isEmpty(),
      check("status", "Status is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      company,
      location,
      website,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      linkedin,
      instagram,
      twitter
    } = req.body;

    // Build profile object
    const profileFileds = {};
    profileFileds.user = req.user.id;
    if (company) profileFileds.company = company;
    if (website) profileFileds.website = website;
    if (location) profileFileds.location = location;
    if (bio) profileFileds.bio = bio;
    if (status) profileFileds.status = status;
    if (githubusername) profileFileds.githubusername = githubusername;
    if (skills) {
      profileFileds.skills = skills.split(",").map(skill => skill.trim());
    }
    // Build social object
    const social = {};
    if (youtube) social.youtube = youtube;
    if (facebook) social.facebook = facebook;
    if (twitter) social.twitter = twitter;
    if (linkedin) social.linkedin = linkedin;
    if (instagram) social.instagram = instagram;

    if (Object.entries(social).length > 0) {
      profileFileds.social = social;
    }

    try {
      let profile = await Profile.findOne({ user: req.body.id });
      if (profile) {
        profile = await Profile.findOneAndUpdate(
          { user: req.body.id },
          { $set: profileFileds },
          { new: true }
        );
        return res.json(profile);
      }
      profile = new Profile(profileFileds);
      await profile.save();
      return res.json(profile);
    } catch (err) {
      console.log(err.message);
      return res.status(500).send("Server Error");
    }
  }
);

//@route    Delete api/profile/
//@desc     Delete profile, posts, user
//@access   Private
router.delete("/", auth, async (req, res) => {
  try {
    //Delete Profile
    const profile = await Profile.findOne({ user: req.user.id });
    if (profile) {
      await Profile.findOneAndRemove({ user: req.user.id });
    }
    //@todo Delete Post
    //Delete User
    const user = await User.findOne({ _id: req.user.id });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }
    await User.findByIdAndRemove({ _id: req.user.id });
    res.json({ msg: "User deleted" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

//@route    PUT api/profile/experience
//@desc     Add or Update experience
//@access   Private
router.put(
  "/experience",
  [
    auth,
    [
      check("title", "Job title is required")
        .not()
        .isEmpty(),
      check("company", "Company name is required")
        .not()
        .isEmpty(),
      check("from", "From data is required")
        .not()
        .isEmpty(),
      check("from", "From date is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    } = req.body;
    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    };
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.experience.unshift(newExp);
      await profile.save();
      return res.json({ msg: "Profile updated" });
    } catch (error) {
      console.log(error);
      return res.send("Server Error");
    }
  }
);

//@route    Delete api/profile/experience/:exp_id
//@desc     Delete user experience
//@access   Private
router.delete("/experience/:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    profile.experience = profile.experience.filter(
      exp => exp._id.toString() !== req.params.exp_id
    );

    await profile.save();
    return res.json(profile);
  } catch (error) {
    console.log(error);
    return res.send("Server Error");
  }
});

//@route    PUT api/profile/education
//@desc     Add or Update education
//@access   Private
router.put(
  "/education",
  [
    auth,
    [
      check("school", "School is required")
        .not()
        .isEmpty(),
      check("degree", "Degree is required")
        .not()
        .isEmpty(),
      check("fieldofstudy", "Fieldofstudty is required")
        .not()
        .isEmpty(),
      check("from", "From date is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    } = req.body;
    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    };
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.education.unshift(newEdu);
      await profile.save();
      return res.json(profile);
    } catch (error) {
      console.log(error);
      return res.send("Server Error");
    }
  }
);

//@route    Delete api/profile/experience/:edu_id
//@desc     Delete user experience
//@access   Private
router.delete("/education/:edu_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    profile.education = profile.education.filter(
      edu => edu._id.toString() !== req.params.edu_id
    );

    await profile.save();
    return res.json(profile);
  } catch (error) {
    console.log(error);
    return res.send("Server Error");
  }
});

//@route    GET api/profile/github/:username
//@desc     Get user repos from Github
//@access   Public
router.get("/github/:username", async (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        "gitClientId"
      )}&client_secret=${config.get("gitClientSecret")}`,
      method: "GET",
      headers: { "user-agent": "node.js" }
    };
    request(options, (error, response, body) => {
      if (error) {
        console.log(error);
        return res.status(400).json({ msg: "Not able to connect to github" });
      }
      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: "github profile not found" });
      }
      return res.json(JSON.parse(body));
    });
  } catch (error) {
    console.log(error);
    return res.send("Server Error");
  }
});

module.exports = router;
