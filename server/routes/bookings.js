import express from 'express';
import auth from '../middleware/auth.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';

const router = express.Router();

const toDate = iso => new Date(iso);

function isAlignedTo30(date) {
  const m = date.getMinutes();
  return m === 0 || m === 30;
}

function inWorkingHours(date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 540 && minutes < 1260; // 09:00–21:00
}

function dayBoundsFor(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/* GET /me - student's bookings */
router.get('/me', auth, async (req, res) => {
  try {
    const list = await Booking.find({ student: req.user._id }).sort({ slotStart: 1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* GET /slots?date=YYYY-MM-DD - returns 30-min windows 9am-9pm for a date */
router.get('/slots', auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: 'Date required' });

    if (req.user.role === 'student' && req.user.status !== 'approved') {
      return res.status(403).json({ msg: 'Account not approved' });
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const slots = [];
    const startBase = new Date(dayStart);
    startBase.setHours(9,0,0,0);

    while (startBase.getHours() < 21 || (startBase.getHours() === 20 && startBase.getMinutes() === 30)) {
      const s = new Date(startBase);
      const e = new Date(s); e.setMinutes(e.getMinutes() + 30);
      slots.push({ slotStart: s.toISOString(), slotEnd: e.toISOString(), bookingsCount: 0, bookings: [] });
      startBase.setMinutes(startBase.getMinutes() + 30);
    }

    const bookings = await Booking.find({
      slotStart: { $lt: dayEnd },
      slotEnd: { $gt: dayStart }
    }).populate('student', 'name course').lean();

    for (const slot of slots) {
      const ws = new Date(slot.slotStart);
      const we = new Date(slot.slotEnd);
      const overlapping = bookings.filter(b => b.slotStart < we && b.slotEnd > ws);
      slot.bookingsCount = overlapping.length;
      slot.bookings = overlapping.map(b => ({ _id: b._id, student: b.student, company: b.company, round: b.round }));
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* POST / - create booking */
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student' || req.user.status !== 'approved') return res.status(403).json({ msg: 'Only approved students may book' });

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round) return res.status(400).json({ msg: 'Missing fields' });

    const sDate = toDate(slotStart);
    const eDate = toDate(slotEnd);

    if (isNaN(sDate) || isNaN(eDate)) return res.status(400).json({ msg: 'Invalid dates' });
    if (eDate <= sDate) return res.status(400).json({ msg: 'End must be after start' });
    if (!isAlignedTo30(sDate) || !isAlignedTo30(eDate)) return res.status(400).json({ msg: 'Times must be :00 or :30 aligned' });
    if (!inWorkingHours(sDate) || !inWorkingHours(new Date(eDate - 1))) return res.status(400).json({ msg: 'Out of allowed hours (9am–9pm)' });

    // build windows
    const windows = [];
    let cur = new Date(sDate);
    while (cur < eDate) {
      const next = new Date(cur); next.setMinutes(next.getMinutes() + 30);
      windows.push({ start: new Date(cur), end: new Date(next) });
      cur = next;
    }

    // student's daily count
    const { start: dayStart } = dayBoundsFor(sDate);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const todaysBookings = await Booking.countDocuments({ student: req.user._id, slotStart: { $gte: dayStart, $lt: dayEnd } });
    if (todaysBookings >= 5) return res.status(400).json({ msg: 'Daily booking limit reached (5)' });

    // capacity per window (6)
    for (const w of windows) {
      const count = await Booking.countDocuments({ slotStart: { $lt: w.end }, slotEnd: { $gt: w.start } });
      if (count >= 6) {
        return res.status(409).json({ msg: `Window full: ${w.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` });
      }
    }

    const booking = await Booking.create({
      student: req.user._id,
      slotStart: sDate,
      slotEnd: eDate,
      company,
      round,
      approved: false
    });

    const populated = await Booking.findById(booking._id).populate('student','name course');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* PUT /:id - update booking (student only) */
router.put('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Not found' });
    if (booking.student.toString() !== req.user._id.toString()) return res.status(403).json({ msg: 'Not your booking' });

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round) return res.status(400).json({ msg: 'Missing fields' });

    const sDate = toDate(slotStart);
    const eDate = toDate(slotEnd);
    if (isNaN(sDate) || isNaN(eDate)) return res.status(400).json({ msg: 'Invalid dates' });
    if (eDate <= sDate) return res.status(400).json({ msg: 'End must be after start' });
    if (!isAlignedTo30(sDate) || !isAlignedTo30(eDate)) return res.status(400).json({ msg: 'Times must be aligned' });
    if (!inWorkingHours(sDate) || !inWorkingHours(new Date(eDate - 1))) return res.status(400).json({ msg: 'Out of hours' });

    // windows covered
    const windows = [];
    let cur = new Date(sDate);
    while (cur < eDate) {
      const next = new Date(cur); next.setMinutes(next.getMinutes()+30);
      windows.push({ start: new Date(cur), end: new Date(next) });
      cur = next;
    }

    const { start: dayStart } = dayBoundsFor(sDate);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1);
    const todaysBookings = await Booking.countDocuments({
      student: req.user._id,
      slotStart: { $gte: dayStart, $lt: dayEnd },
      _id: { $ne: booking._id } // exclude current booking
    });
    if (todaysBookings >= 5) return res.status(400).json({ msg: 'Daily booking limit reached (5)' });

    // capacity check - ignore current booking itself (allow moving if it frees prior windows)
    for (const w of windows) {
      const count = await Booking.countDocuments({
        slotStart: { $lt: w.end },
        slotEnd: { $gt: w.start },
        _id: { $ne: booking._id }
      });
      if (count >= 6) {
        return res.status(409).json({ msg: `Window full: ${w.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` });
      }
    }

    booking.slotStart = sDate;
    booking.slotEnd = eDate;
    booking.company = company;
    booking.round = round;
    // per your last instruction, editing DOES NOT reset approval: admin approval only for signup
    await booking.save();
    const populated = await Booking.findById(booking._id).populate('student','name course');
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* DELETE /:id/student - student removes own booking */
router.delete('/:id/student', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Not found' });
    if (booking.student.toString() !== req.user._id.toString()) return res.status(403).json({ msg: 'Not your booking' });
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Booking removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* DELETE /:id - admin deletes booking (admin only) */
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});


export default router;
