const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const Post = require("../../models/Post");
const User = require("../../models/User");

//@route    POST api/posts
//@desc     Create a post
//@access   Private
router.post(
  "/",
  [
    auth,
    [
      check("text", "text is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id);
      const { name, avatar } = user;
      const newPost = {
        text: req.body.text,
        name,
        avatar,
        user: req.user.id
      };
      const post = new Post(newPost);
      await post.save();
      res.json(post);
    } catch (error) {
      console.log(error);
      res.status(500).send("Server Error");
    }
  }
);

//@route    GET api/posts
//@desc     Get all the posts
//@access   private
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    if (!posts) {
      return res.status(400).json({ msg: "No posts found" });
    }
    return res.json(posts);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server Error");
  }
});

//@route    GET api/posts/:post_id
//@desc     Get the post by id
//@access   private
router.get("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found" });
    }
    return res.json(post);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server Error");
  }
});

//@route    DELETE api/posts/:post_id
//@desc     Delete the post by id
//@access   Private
router.delete("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found" });
    }
    if (req.user.id !== post.user.toString()) {
      return res.status(401).json({ msg: "User not authorized" });
    }
    await Post.findByIdAndRemove(req.params.post_id);
    return res.json({ msg: "Post deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server Error");
  }
});

//@route    Put api/posts/like/:post_id
//@desc     Like a post
//@access   Private
router.put("/like/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found" });
    }
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length > 0
    ) {
      return res.status(400).json({ msg: "Post laready liked" });
    }
    post.likes.unshift({ user: req.user.id });
    await post.save();
    return res.json(post);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server Error");
  }
});

//@route    Put api/posts/unlike/:post_id
//@desc     Unlike a post
//@access   Private
router.put("/unlike/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found" });
    }
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length ===
      0
    ) {
      return res.status(400).json({ msg: "Post has not yet been liked" });
    }
    post.likes = post.likes.filter(
      like => like.user.toString() !== req.user.id
    );
    await post.save();
    return res.json(post);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server Error");
  }
});

//@route    Put api/posts/commnet/:post_id
//@desc     comment on a post
//@access   Private
router.put(
  "/comment/:post_id",
  [
    auth,
    check("text", "Text is required")
      .not()
      .isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const post = await Post.findById(req.params.post_id);
      if (!post) {
        return res.status(400).json({ msg: "Post not found" });
      }
      const user = await User.findById(req.user.id);
      const { name, avatar } = user;
      const newCommnet = {
        user: req.user.id,
        text: req.body.text,
        name,
        avatar
      };
      post.comments.unshift(newCommnet);
      await post.save();
      return res.json(post);
    } catch (error) {
      console.log(error);
      return res.status(500).send("Server Error");
    }
  }
);

//@route    Delete api/posts/commnet/:post_id/:comment_id
//@desc     Delete comment
//@access   Private
router.delete("/comment/:post_id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    if (!post) {
      return res.status(400).json({ msg: "Post not found" });
    }
    const comment = post.comments.find(
      comment => comment._id.toString() === req.params.comment_id
    );
    if (!comment) {
      return res.status(400).json({ msg: "Comment does not exists" });
    }
    if (comment.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: "You are not authorized to delete this commnet" });
    }
    post.comments = post.comments.filter(
      comment => comment._id.toString() !== req.params.comment_id
    );
    await post.save();
    return res.json(post);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Server Error");
  }
});

module.exports = router;
