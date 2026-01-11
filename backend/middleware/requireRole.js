function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(403).json({ message: "Role missing in token" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Forbidden (role)" });
    }

    next();
  };
}

module.exports = requireRole;
