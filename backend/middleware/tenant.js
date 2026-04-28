module.exports = function (req, res, next) {
  try {
    const host = req.headers.host || "";

    // remove port if present
    const hostname = host.split(":")[0];

    // split subdomain
    const parts = hostname.split(".");

    let tenant = null;

    if (parts.length >= 3) {
      tenant = parts[0]; // tenant1.clearenroll.local
    }

    // fallback (for testing without subdomain)
    if (!tenant) {
      tenant = "default";
    }

    req.tenant = tenant;

    console.log("Tenant:", tenant);

    next();
  } catch (err) {
    console.error("Tenant middleware error:", err);
    res.status(500).json({ error: "Tenant detection failed" });
  }
};