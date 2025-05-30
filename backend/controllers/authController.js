import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Set cookie options (secure, HTTP-only in production)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // only secure over HTTPS in production
  sameSite: "Strict",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  // Inline validation
  if (!email || !password || !fullName)
    return res.status(400).json({ msg: "All fields  are required." });

  if (!/\S+@\S+\.\S+/.test(email))
    return res.status(400).json({ msg: "Invalid email format." });

  if (password.length < 6)
    return res
      .status(400)
      .json({ msg: "Password must be at least 6 characters." });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();

    const token = generateToken(newUser._id);
    const userWithoutPassword = newUser.toObject();
    delete userWithoutPassword.password;
    res
      .cookie("token", token, cookieOptions)
      .status(201)
      .json({ userId: newUser._id, user: userWithoutPassword });
  } catch (err) {
    console.error("error in signup Route" + err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ msg: "Email and password are required." });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Invalid email or password." });

    const token = generateToken(user._id);
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;
    res
      .cookie("token", token, cookieOptions)
      .status(200)
      .json({ userId: user._id, user: userWithoutPassword });
  } catch (err) {
    console.error("error in login Route" + err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.status(200).json({ msg: "Logged out" });
};

// Middleware to protect routes by verifying JWT token
//  // Adjust the import according to your project structure

export const protectRoute = async (req, res, next) => {
  // Get the token from cookies
  const token = req.cookies?.token;

  // If no token found, return 401 Unauthorized
  if (!token) {
    return res.status(401).json({ msg: "Not authorized. No token found." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the database using userId from decoded token
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    // Attach the user object to the request so it can be accessed in the next middleware or route handler
    req.user = user;

    next(); // Call the next middleware or route handler
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(401).json({ msg: "Invalid or expired token." });
  }
};

// Route handler to fetch user details
export const getUserDetails = async (req, res) => {
  try {
    // Find the user by userId which was added to the request object by the middleware
    const user = await User.findById(req.user._id).select("-password"); // Exclude the password field

    // If the user is not found, return a 404 error
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Return the user details in the response
    res.status(200).json({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
    });
  } catch (err) {
    console.error("Profile fetch error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};
