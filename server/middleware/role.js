export default function role(required) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== required) {
      return res.status(403).json({ msg: "Access denied" });
    }
    next();
  };
}
