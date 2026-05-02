import {
  createUser,
  getAllUsers,
  getUserByID,
  getUserByEmail,
  updateUser,
  updateUserPassword,
  deleteUser,
  getUserByUsername,
} from "../dao/userDao.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// POST /api/users (Registrace)
export async function createUserController(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });
    }

    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const existingUsername = await getUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        message: "User with this username already exists",
      });
    }

    const newUser = await createUser({ username, email, password });
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("createUserController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// GET /api/users
export async function getAllUserController(req, res) {
  try {
    const users = await getAllUsers();
    return res.status(200).json(users);
  } catch (error) {
    console.error("getAllUsersController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// GET /api/users/:id
export async function getUserByIdController(req, res) {
  try {
    const { id } = req.params;

    const user = await getUserByID(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("getUserByIdController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// PUT /api/users/:id
export async function updateUserController(req, res) {
  try {
    const { id } = req.params;

    if (req.user.id !== Number(id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        message: "Username and email are required",
      });
    }

    const updated = await updateUser(id, username, email);

    if (!updated) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("updateUserController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// PUT /api/users/:id/password
export async function updateUserPasswordController(req, res) {
  try {
    const { id } = req.params;

    if (req.user.id !== Number(id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    const updated = await updateUserPassword(id, password);

    if (!updated) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("updateUserPasswordController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// DELETE /api/users/:id
export async function deleteUserController(req, res) {
  try {
    const { id } = req.params;

    if (req.user.id !== Number(id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const deleted = await deleteUser(id);

    if (!deleted) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("deleteUserController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// POST /api/users/login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    console.log("LOGIN BODY:", req.body);

    // kontrola vstupů
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // najdi usera podle emailu
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // porovnání hesla
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // issue JWT
    const token = jwt.sign(
      { sub: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // úspěch
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}
