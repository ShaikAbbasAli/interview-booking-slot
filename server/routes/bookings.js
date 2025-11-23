// server/routes/bookings.js
import express from "express";
import auth from "../middleware/auth.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* ---------------------------------------------------------
   Convert Date to LOCAL ISO-like string (NO "Z")
   Example: 2025-11-23T09:00
--------------------------------------------------------- */
function toLocalISO(dt) {
  return (
    dt.getFullYear() +
    "-" +
    String(dt.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(dt.getDate()).padStart(2, "0") +
    "T" +
    String(dt.getHours()).padStart(2, "0") +
    ":" +
    String(dt.getMinutes()).padStart(2, "0")
  );
}

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const toDate = (iso) => new Date(iso);

function isAlignedTo30(d) {
  return d.getMinutes() === 0 || d.getMinutes() === 30;
}

// 9 AM – 9 PM (inclusive of 9:00, exclusive of 21:00)
function inWorkingHours(d) {
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= 9 * 60 && m < 21 * 60;
}

function dayStartEnd(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/* ---------------------------------------------------------
   GET /bookings/me — student bookings
--------------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const list = await Booking.find({ student: req.user._id })
      .sort({ slotStart: 1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET /bookings/slots?date=YYYY-MM-DD
   Generate 9AM → 9PM slots in LOCAL (no Z)
--------------------------------------------------------- */
router.get("/slots", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: "Date required" });

    if (req.user.role === "student" && req.user.status !== "approved") {
      return res.status(403).json({ msg: "Account not approved" });
    }

    const { start: dayStart, end: dayEnd } = dayStartEnd(date);

    // generate 30-min windows from 09:00 to 21:00
    const slots = [];
    let cur = new Date(dayStart);
    cur.setHours(9, 0, 0, 0); // 09:00

    while (cur.getHours() < 21) {
      const end = new Date(cur.getTime() + 30 * 60000);

      // stop if END goes past 21:00
      if (end.getHours() > 21 || (end.getHours() === 21 && end.getMinutes() > 0)) {
        break;
      }

      slots.push({
        slotStart: toLocalISO(cur),
        slotEnd: toLocalISO(end),
        bookingsCount: 0,
        bookings: [],
      });

      cur = end;
    }

    // load bookings from DB
    const bookings = await Booking.find({
      slotStart: { $lt: dayEnd },
      slotEnd: { $gt: dayStart },
    })
      .populate("student", "name course")
      .lean();

    // attach bookings to each slot
    for (const slot of slots) {
      const ws = new Date(slot.slotStart);
      const we = new Date(slot.slotEnd);

      const overlapping = bookings.filter(
        (b) => new Date(b.slotStart) < we && new Date(b.slotEnd) > ws
      );

      slot.bookingsCount = overlapping.length;
      slot.bookings = overlapping.map((b) => ({
        _id: b._id,
        student: b.student,
        company: b.company,
        round: b.round,
      }));
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   POST /bookings — Create booking
--------------------------------------------------------- */
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "student" || req.user.status !== "approved") {
      return res.status(403).json({ msg: "Only approved students may book" });
    }

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const s = toDate(slotStart);
    const e = toDate(slotEnd);

    if (isNaN(s) || isNaN(e)) {
      return res.status(400).json({ msg: "Invalid date" });
    }
    if (e <= s) {
      return res.status(400).json({ msg: "End must be after start" });
    }

    if (!isAlignedTo30(s) || !isAlignedTo30(e)) {
      return res
        .status(400)
        .json({ msg: "Times must align to :00 or :30" });
    }

    if (!inWorkingHours(s) || !inWorkingHours(new Date(e - 1))) {
      return res
        .status(400)
        .json({ msg: "Out of allowed hours (9 AM – 9 PM)" });
    }

    // Daily limit: 5 bookings per student
    const { start: dayStart, end: dayEnd } = dayStartEnd(slotStart);
    const todaysCount = await Booking.countDocuments({
      student: req.user._id,
      slotStart: { $gte: dayStart, $lt: dayEnd },
    });
    if (todaysCount >= 5) {
      return res.status(400).json({ msg: "Daily limit reached (5)" });
    }

    // Windows covered by booking (for capacity 6)
    const windows = [];
    let cur = new Date(s);
    while (cur < e) {
      const next = new Date(cur.getTime() + 30 * 60000);
      windows.push({ start: new Date(cur), end: new Date(next) });
      cur = next;
    }

    for (const w of windows) {
      const c = await Booking.countDocuments({
        slotStart: { $lt: w.end },
        slotEnd: { $gt: w.start },
      });
      if (c >= 6) {
        return res.status(409).json({
          msg: `Window full: ${w.start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
        });
      }
    }

    const booking = await Booking.create({
      student: req.user._id,
      slotStart: s,
      slotEnd: e,
      company,
      round,
    });

    const populated = await Booking.findById(booking._id).populate(
      "student",
      "name course"
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   PUT /bookings/:id — Student edit booking
--------------------------------------------------------- */
router.put("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Not found" });

    if (booking.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not your booking" });
    }

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const s = toDate(slotStart);
    const e = toDate(slotEnd);

    if (isNaN(s) || isNaN(e)) {
      return res.status(400).json({ msg: "Invalid date" });
    }
    if (e <= s) {
      return res.status(400).json({ msg: "End must be after start" });
    }

    if (!isAlignedTo30(s) || !isAlignedTo30(e)) {
      return res.status(400).json({ msg: "Times must align" });
    }

    if (!inWorkingHours(s) || !inWorkingHours(new Date(e - 1))) {
      return res.status(400).json({ msg: "Out of allowed hours (9 AM – 9 PM)" });
    }

    // Windows to check capacity (ignore this booking itself)
    const windows = [];
    let cur = new Date(s);
    while (cur < e) {
      const next = new Date(cur.getTime() + 30 * 60000);
      windows.push({ start: new Date(cur), end: new Date(next) });
      cur = next;
    }

    for (const w of windows) {
      const c = await Booking.countDocuments({
        slotStart: { $lt: w.end },
        slotEnd: { $gt: w.start },
        _id: { $ne: booking._id },
      });
      if (c >= 6) {
        return res.status(409).json({
          msg: `Window full: ${w.start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
        });
      }
    }

    booking.slotStart = s;
    booking.slotEnd = e;
    booking.company = company;
    booking.round = round;

    await booking.save();

    const populated = await Booking.findById(booking._id).populate(
      "student",
      "name course"
    );

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   DELETE /bookings/:id/student — Student delete own booking
--------------------------------------------------------- */
router.delete("/:id/student", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Not found" });

    if (booking.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Not your booking" });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Booking removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   DELETE /bookings/:id — Admin delete any booking
--------------------------------------------------------- */
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Admin only" });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
