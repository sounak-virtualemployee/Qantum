const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Assuming the token is in the format "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    
    if (decoded.type === "Photographer") {
      req.user = decoded; // Attach user info to the request object
      // console.log("hi", decoded);
    }

    else if (decoded.type !== "Photographer") {
      return res.status(403).json({ error: "Access forbidden: Admins only" });
    }


    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(403).json({ message: "Forbidden: Invalid token,Please Login Again" });
  }
};

module.exports = verifyToken;
