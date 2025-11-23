import express from "express";
import auth from "../middleware/auth.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* ------------------------------------------------------------------
   Utility helpers
------------------------------------------------------------------ */
function toDate(iso) {
  return new Date(iso);
}

function isAlignedTo30(date) {
  return date.getMinutes() === 0 || date.getMinutes() === 30;
}

// Working hours: 9 AM → 9 PM
function inWorkingHours(date) {
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins >= 9 * 60 && mins < 21 * 60; // allowed until 20:59
}

function dayBounds(dateISO) {
  const d = new Date(dateISO);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/* ------------------------------------------------------------------
   GET /bookings/me — student bookings
------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------
   GET /bookings/slots?date=YYYY-MM-DD
   ✔ Correct slot generator: 9:00 AM to 9:00 PM
------------------------------------------------------------------ */
router.get("/slots", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: "Date required" });

    if (req.user.role === "student" && req.user.status !== "approved") {
      return res.status(403).json({ msg: "Account not approved" });
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    /* --------------------------------------------------------------
       Generate 30-min windows from 09:00 → 21:00 (9 PM)
    -------------------------------------------------------------- */
    const slots = [];
    let start = new Date(dayStart);
    start.setHours(9, 0, 0, 0); // 09:00 AM

    while (true) {
      const end = new Date(start.getTime() + 30 * 60000);

      // Stop once END time hits exactly 21:00
      if (end.getHours() === 21 && end.getMinutes() === 0) {
        slots.push({
          slotStart: start.toISOString(),
          slotEnd: end.toISOString(),
          bookingsCount: 0,
          bookings: [],
        });
        break;
      }

      // Stop if start time goes past 9 PM
      if (start.getHours() >= 21) break;

      slots.push({
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
        bookingsCount: 0,
        bookings: [],
      });

      start = end; // Move forward 30 minutes
    }

    /* --------------------------------------------------------------
       Load bookings and match overlaps
    -------------------------------------------------------------- */
    const bookings = await Booking.find({
      slotStart: { $lt: dayEnd },
      slotEnd: { $gt: dayStart },
    })
      .populate("student", "name course")
      .lean();

    for (const slot of slots) {
      const ws = new Date(slot.slotStart);
      const we = new Date(slot.slotEnd);

      const overlapping = bookings.filter(
        (b) => b.slotStart < we && b.slotEnd > ws
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

/* ------------------------------------------------------------------
   POST /bookings — Create booking
------------------------------------------------------------------ */
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "student" || req.user.status !== "approved")
      return res
        .status(403)
        .json({ msg: "Only approved students may book" });

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round)
      return res.status(400).json({ msg: "Missing fields" });

    const s = new Date(slotStart);
    const e = new Date(slotEnd);

    if (e <= s) return res.status(400).json({ msg: "End must be after start" });
    if (!isAlignedTo30(s) || !isAlignedTo30(e))
      return res.status(400).json({ msg: "Times must align to :00 or :30" });
    if (!inWorkingHours(s) || !inWorkingHours(new Date(e - 1)))
      return res
        .status(400)
        .json({ msg: "Out of allowed hours (9 AM – 9 PM)" });

    // Build windows inside booking
    const windows = [];
    let cur = new Date(s);
    while (cur < e) {
      const next = new Date(cur.getTime() + 30 * 60000);
      windows.push({ start: new Date(cur), end: new Date(next) });
      cur = next;
    }

    // Daily limit: 5 bookings
    const { start: dayStart } = dayBounds(slotStart);
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const countToday = await Booking.countDocuments({
      student: req.user._id,
      slotStart: { $gte: dayStart, $lt: dayEnd },
    });

    if (countToday >= 5)
      return res.status(400).json({ msg: "Daily limit reached (5)" });

    // Capacity check per 30-min window (max 6)
    for (const w of windows) {
      const count = await Booking.countDocuments({
        slotStart: { $lt: w.end },
        slotEnd: { $gt: w.start },
      });

      if (count >= 6) {
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

/* ------------------------------------------------------------------
   PUT /bookings/:id — Edit booking
------------------------------------------------------------------ */
router.put("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Not found" });
    if (booking.student.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your booking" });

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round)
      return res.status(400).json({ msg: "Missing fields" });

    const s = new Date(slotStart);
    const e = new Date(slotEnd);

    if (!isAlignedTo30(s) || !isAlignedTo30(e))
      return res.status(400).json({ msg: "Times must align" });
    if (!inWorkingHours(s) || !inWorkingHours(new Date(e - 1)))
      return res
        .status(400)
        .json({ msg: "Out of allowed hours (9 AM – 9 PM)" });

    // capacity checks
    const windows = [];
    let cur = new Date(s);
    while (cur < e) {
      const next = new Date(cur.getTime() + 30 * 60000);
      windows.push({ start: new Date(cur), end: new Date(next) });
      cur = next;
    }

    for (const w of windows) {
      const count = await Booking.countDocuments({
        slotStart: { $lt: w.end },
        slotEnd: { $gt: w.start },
        _id: { $ne: booking._id },
      });

      if (count >= 6) {
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

/* ------------------------------------------------------------------
   DELETE booking (student)
------------------------------------------------------------------ */
router.delete("/:id/student", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Not found" });
    if (booking.student.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your booking" });

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Booking removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ------------------------------------------------------------------
   DELETE booking (admin)
------------------------------------------------------------------ */
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ msg: "Admin only" });

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
