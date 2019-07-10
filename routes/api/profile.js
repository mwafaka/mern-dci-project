const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Post = require("../../models/Post");
const fs = require("fs");
const { check, validationResult } = require("express-validator/check");
const request = require("request");
const config = require("config");
const mongoose = require("mongoose");
const path = require("path");
/////////// Upload Image /////////////////////
// const multer = require("multer");

// const storage = multer.diskStorage({
//   destination: function(req, res, cb) {
//     cb(null, "./uploads/");
//   },
//   filename: function(req, file, cb) {
//     cb(null, new Date().toISOString() + file.originalname);
//   }
// });
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
//     cb(null, false);
//   } else {
//     cb(null, true);
//   }
// };

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 1024 * 1024 * 5 },
//   fileFilter: fileFilter
// });
////////////////////////////////////
// Get api/profile/me
// Get current users profile
router.get("/me", auth, async (req, res) => {
  try {
    await Profile.findOne(
      { user: mongoose.Types.ObjectId(req.user._id) },
      (err, doc) => {
        console.log("profile", doc);
      }
    );

    const profile = await Profile.findOne({
      user: mongoose.Types.ObjectId(req.user._id)
    }).populate("user", ["name", "imageUrl"]);

    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Post api/profile
// Create user profile
router.post(
  "/",
  // upload.single("imageUrl"),
  [
    auth
    // [
    //   check("status", "Status is required")
    //     .not()
    //     .isEmpty(),
    //   check("offers", "skills is required")
    //     .not()
    //     .isEmpty()
    // ]
  ],
  async (req, res) => {
    console.log(req.files);

    var imageUrl = "";
    if (Object.keys(req.files).length == 0) {
      imageUrl = "No_Image_Available.jpg";
    } else {
      let newImage = req.files.fileImage;
      if (
        newImage.mimetype !== "image/png" &&
        newImage.mimetype !== "image/jpeg" &&
        newImage.mimetype !== "image/gif"
      ) {
        return res.send({ error: "only files with extention: png, gif, jpeg" });
      }
      let imageName = newImage.name.split(".");
      let imageExtention = imageName[imageName.length - 1];
      imageUrl = JSON.parse(req.body.userId) + "." + imageExtention;

      fs.writeFileSync(
        path.normalize(".//client//public//images//") + imageUrl,
        newImage.data,
        err => {
          if (err) return res.status(500).send(err);
        }
      );
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      company,
      website,
      location,
      latlng,

      bio,
      status,
      offers,
      youtube,
      facebook,
      twitter,
      instagram
    } = JSON.parse(req.body.profileData);
    // const { imageUrl } = req.file.path;
    //Build profile object
    const profileFields = {};
    profileFields.user = JSON.parse(req.body.userId);
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (latlng) profileFields.latlng = latlng.join();
    if (status) profileFields.status = status;
    if (imageUrl !== "") profileFields.imageUrl = imageUrl;

    if (offers) {
      profileFields.offers = offers.split(",").map(skill => skill.trim());
    }
    // build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (instagram) profileFields.social.instagram = instagram;

    try {
      let profile = await Profile.findOne({ _id: JSON.parse(req.body.userId) });
      if (profile) {
        //Update
        profile = await Profile.findOneAndUpdate(
          { user: JSON.parse(req.body.userId) },
          { $set: profileFields },
          { new: true }
        );
        return res.json(profile);
      }
      // Create
      profile = new Profile(profileFields);
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

///////////////////////////////
router.put("/update", [auth], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const {
    company,
    website,
    offers,
    bio,
    status,
    youtube,
    imageUrl,
    facebook,
    twitter,
    instagram
  } = req.body;
  //Build profile object
  Profile.findOne(
    { user: mongoose.Types.ObjectId(req.user._id) },
    (err, profileDB) => {
      if (!profileDB)
        return res.status(400).send({ message: "leider profile not found" });

      if (company) profileDB.company = company;
      if (website) profileDB.website = website;
      if (bio) profileDB.bio = bio;
      if (status) profileDB.status = status;
      if (imageUrl) profileDB.imageUrl = imageUrl;

      if (offers) {
        profileDB.offers = offers.split(",").map(skill => skill.trim());
      }

      if (youtube) profileDB.social.youtube = youtube;
      if (twitter) profileDB.social.twitter = twitter;
      if (facebook) profileDB.social.facebook = facebook;
      if (instagram) profileDB.social.instagram = instagram;

      profileDB.save().then(e => {
        res.send(profileDB);
      });
    }
  );
});

// Get all Profiles
// Get api/profile
// access Public
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", [
      "name",
      "imageUrl"
    ]);
    res.json(profiles);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});
// Get  Profile by user id
// Get api/profile/user/:user_id
// access Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate("user", ["name", "imageUrl"]);
    if (!profile)
      return res.status(400).json({ msg: "There is no profile found" });
    res.json(profile);
  } catch (error) {
    console.error(error.message);
    if (err.kind == "ObjectId") {
      return res.status(400).json({ msg: " profile not found" });
    }
    res.status(500).send("Server Error");
  }
});

// Delete profile,user&posts
// Delete api/profile
// access Public
router.delete("/", auth, async (req, res) => {
  try {
    //remove users posts
    await Post.deleteMany({ user: req.user._id });
    //Remove profile
    await Profile.findOneAndRemove({ user: req.user._id });
    // remove user
    await User.findOneAndRemove({ _id: req.user._id });
    res.json({ msg: "User removed" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// Add events
// Put  api/profile/event
// Access Private

router.put(
  "/event",
  [
    auth,
    [
      check("title", "Title is required")
        .not()
        .isEmpty(),
      check("company", "Company is required")
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
      const profile = await Profile.findOne({ user: req.user._id });
      profile.about.unshift(newExp);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server Error");
    }
  }
);
// Delete  event from  profile
// Delete  api/profile/event/:ev_id
// Access Private
router.delete("/event/:ev_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ _id: req.user._id });
    // Get remove index
    const removeIndex = profile.about
      .map(item => item._id)
      .indexOf(req.params.ev_id);
    profile.about.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// Add profile education
// Put  api/profile/education
// Access Private
router.put(
  "/another",
  [
    auth,
    [
      check("school", "school is required")
        .not()
        .isEmpty(),
      check("degree", "degree is required")
        .not()
        .isEmpty(),
      check("fieldofstudy", "Field of study is required")
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
      const profile = await Profile.findOne({ _id: req.user._id });
      profile.another.unshift(newEdu);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server Error");
    }
  }
);
// Delete  education from  profile
// Delete  api/profile/education/:edu_id
// Access Private
router.delete("/another/:edu_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ _id: req.user._id });
    // Get remove index
    const removeIndex = profile.another
      .map(item => item._id)
      .indexOf(req.params.edu_id);
    profile.another.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// Get  user repos from  Github
// Delete  api/profile/github/:username
// Access public
// router.get("/github/:username", (req, res) => {
//   try {
//     const options = {
//       uri: `https://api.github.com/users/${
//         req.params.username
//       }/repos?per_page=5&sort=created:asc&client_id=${config.get(
//         "githubClientId"
//       )}&client_secret=${config.get("githubSecret")}`,
//       method: "GET",
//       headers: { "user-agent": "node.js" }
//     };
//     request(options, (error, response, body) => {
//       if (error) console.error(error);
//       if (response.statusCode !== 200) {
//         return res.status(400).json({ msg: "No Github profile found " });
//       }
//       res.json(JSON.parse(body));
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send("Server Error");
//   }
// });

module.exports = router;
