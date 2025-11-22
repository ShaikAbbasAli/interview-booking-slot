// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ msg: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    console.error('AUTH ERROR:', err);
    return res.status(401).json({ msg: 'Invalid token' });
  }
}
