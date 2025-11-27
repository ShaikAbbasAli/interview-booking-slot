import express from "express";
import auth from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import { ALL_DESKS } from "../config.js";

const router = express.Router();

/* ---------------------------------------------------------
   CONSTANTS & HELPERS (IST <-> UTC)
--------------------------------------------------------- */

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, "0");

/* Convert IST string (YYYY-MM-DDTHH:mm) -> UTC Date */
function istStringToUTC(iso) {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  const utcFake = new Date(Date.UTC(y, m - 1, d, hh, mm));
  return new Date(utcFake.getTime() - IST_OFFSET);
}

/* Convert UTC -> "YYYY-MM-DDTHH:mm" (IST) */
function toISTString(dateUTC) {
  const ms = dateUTC.getTime() + IST_OFFSET;
  const ist = new Date(ms);

  return (
    ist.getUTCFullYear() +
    "-" +
    pad(ist.getUTCMonth() + 1) +
    "-" +
    pad(ist.getUTCDate()) +
    "T" +
    pad(ist.getUTCHours()) +
    ":" +
    pad(ist.getUTCMinutes())
  );
}

/* Get IST day's 00:00 UTC start & end */
function dayStartEndIST(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);

  const fake = new Date(Date.UTC(y, m - 1, d, 0, 0));
  const start = new Date(fake.getTime() - IST_OFFSET);
  const end = new Date(start.getTime() + 86400000);

  return { start, end };
}

/* Check if minute is :00 or :30 */
function isAlignedTo30IST(dateUTC) {
  const t = new Date(dateUTC.getTime() + IST_OFFSET);
  const mins = t.getUTCMinutes();
  return mins === 0 || mins === 30;
}

/* 9 AM–12 AM working hour check */
function inWorkingHoursIST(dateUTC) {
  const t = new Date(dateUTC.getTime() + IST_OFFSET);
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  return mins >= 540 && mins < 1440;
}

/* ---------------------------------------------------------
   GET /bookings/me – Student's bookings
--------------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const list = await Booking.find({ student: req.user._id })
      .sort({ slotStart: 1 })
      .lean();

    const mapped = list.map((b) => ({
      ...b,
      slotStart: toISTString(new Date(b.slotStart)),
      slotEnd: toISTString(new Date(b.slotEnd)),
    }));

    res.json(mapped);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET /bookings/today (IST)
--------------------------------------------------------- */
router.get("/today", auth, async (req, res) => {
  try {
    const nowIST = new Date(Date.now() + IST_OFFSET);
    const y = nowIST.getUTCFullYear();
    const m = pad(nowIST.getUTCMonth() + 1);
    const d = pad(nowIST.getUTCDate());

    const { start, end } = dayStartEndIST(`${y}-${m}-${d}`);

    const bookings = await Booking.find({
      slotStart: { $lt: end },
      slotEnd: { $gt: start },
    })
      .populate("student", "name employee_id")
      .sort({ slotStart: 1 })
      .lean();

    const mapped = bookings.map((b) => ({
      _id: b._id,
      studentName: b.student?.name || "N/A",
      employee_id: b.student?.employee_id || "-",
      company: b.company,
      round: b.round,
      technology: b.technology,
      slotStart: toISTString(new Date(b.slotStart)),
      slotEnd: toISTString(new Date(b.slotEnd)),
      createdAt: toISTString(new Date(b.createdAt)),
      duration: (new Date(b.slotEnd) - new Date(b.slotStart)) / 60000,
    }));

    res.json(mapped);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET /bookings/by-date?date=YYYY-MM-DD
--------------------------------------------------------- */
router.get("/by-date", auth, async (req, res) => {
  try {
    const dateStr = req.query.date;

    const { start, end } = dayStartEndIST(dateStr);

    const bookings = await Booking.find({
      slotStart: { $lt: end },
      slotEnd: { $gt: start },
    })
      .populate("student", "name employee_id")
      .lean();

    const list = bookings.map((b) => ({
      _id: b._id,
      studentName: b.student?.name || "Unknown",
      employee_id: b.student?.employee_id || "-",
      slotStart: toISTString(new Date(b.slotStart)),
      slotEnd: toISTString(new Date(b.slotEnd)),
      createdAt: toISTString(new Date(b.createdAt)),
      duration: (new Date(b.slotEnd) - new Date(b.slotStart)) / 60000,
      company: b.company,
      round: b.round,
      technology: b.technology,
      desk: b.desk || "-",     // ✅ ADDED THIS
    }));
    res.json(list);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET /bookings/slots – Full day windows (FullDayView)
--------------------------------------------------------- */
router.get("/slots", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: "Date required" });

    if (req.user.role === "student" && req.user.status !== "approved")
      return res.status(403).json({ msg: "Account not approved" });

    const { start: dayStartUTC } = dayStartEndIST(date);

    /* Build 30-minute windows (9 AM – 12 AM IST) */
    const slots = [];
    const startUTC = new Date(dayStartUTC.getTime() + 9 * 3600000);
    const endUTC = new Date(dayStartUTC.getTime() + 24 * 3600000);

    let cur = startUTC;

    while (cur < endUTC) {
      const next = new Date(cur.getTime() + 30 * 60000);
      if (next > endUTC) break;

      slots.push({
        slotStart: toISTString(cur),
        slotEnd: toISTString(next),
        bookingsCount: 0,
        bookings: [],
      });

      cur = next;
    }

    /* Fetch all bookings overlapping this day */
    const { start: rangeStart, end: rangeEnd } = dayStartEndIST(date);

    const bookings = await Booking.find({
      slotStart: { $lt: rangeEnd },
      slotEnd: { $gt: rangeStart },
    })
      .populate("student", "name course employee_id")
      .lean();

    /* Assign bookings to windows */
    for (const slot of slots) {
      const wsUTC = istStringToUTC(slot.slotStart);
      const weUTC = istStringToUTC(slot.slotEnd);

      const overlapping = bookings.filter(
        (b) =>
          new Date(b.slotStart) < weUTC &&
          new Date(b.slotEnd) > wsUTC
      );

      slot.bookingsCount = overlapping.length;
      slot.bookings = overlapping.map((b) => ({
        _id: b._id,
        student: b.student,
        company: b.company,
        round: b.round,
        technology: b.technology,
        desk: b.desk, // 🔥 REQUIRED FOR FULL DAY VIEW
        duration:
          (new Date(b.slotEnd) - new Date(b.slotStart)) / 60000,
      }));
    }

    res.json(slots);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/available-desks", auth, async (req, res) => {
  try {
    const { date, start, duration } = req.query;

    if (!date || !start || !duration)
      return res.status(400).json({ msg: "Missing parameters" });

    const sUTC = istStringToUTC(`${date}T${start}`);
    const eUTC = new Date(sUTC.getTime() + Number(duration) * 60000);

    const overlaps = await Booking.find({
      slotStart: { $lt: eUTC },
      slotEnd: { $gt: sUTC },
    }).lean();

    const booked = overlaps.map((b) => b.desk);

    const free = ALL_DESKS.filter((d) => !booked.includes(d));

    return res.json({ available: free });
  } catch (err) {
    return res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   POST /bookings – Create Booking
--------------------------------------------------------- */
router.post("/", auth, async (req, res) => {
  try {
    const { slotStart, slotEnd, company, round, technology, desk } = req.body;

    if (!slotStart || !slotEnd || !company || !round || !technology || !desk)
      return res.status(400).json({ msg: "Missing fields" });

    if (!ALL_DESKS.includes(desk))
      return res.status(400).json({ msg: "Invalid desk selected" });

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    if (e <= s) return res.status(400).json({ msg: "End must be after start" });

    if (!isAlignedTo30IST(s) || !isAlignedTo30IST(e))
      return res.status(400).json({ msg: "Time must be :00 or :30" });

    if (!inWorkingHoursIST(s) || !inWorkingHoursIST(new Date(e - 1)))
      return res.status(400).json({ msg: "Outside working hours" });

    // Check desk overlap
    const deskOverlap = await Booking.findOne({
      desk,
      slotStart: { $lt: e },
      slotEnd: { $gt: s },
    });

    if (deskOverlap)
      return res.status(400).json({
        msg: `Desk ${desk} is already booked for this time`,
      });

    // Check student overlap
    const studentOverlap = await Booking.findOne({
      student: req.user._id,
      slotStart: { $lt: e },
      slotEnd: { $gt: s },
    });

    if (studentOverlap)
      return res.status(400).json({
        msg: "You already have a booking in this time window",
      });

    const booking = await Booking.create({
      student: req.user._id,
      slotStart: s,
      slotEnd: e,
      company,
      round,
      technology,
      desk,
    });

    return res.status(201).json(booking);
  } catch {
    return res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   PUT /bookings/:id – Edit
--------------------------------------------------------- */
router.put("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Not found" });

    if (booking.student.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your booking" });

    const { slotStart, slotEnd, company, round, technology } = req.body;

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    const nowIST = new Date(Date.now() + IST_OFFSET);
    const sIST = new Date(s.getTime() + IST_OFFSET);

    if (sIST < nowIST)
      return res.status(400).json({ msg: "Cannot edit past slots." });

    booking.slotStart = s;
    booking.slotEnd = e;
    booking.company = company;
    booking.round = round;
    booking.technology = technology;

    await booking.save();
    res.json(booking);
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   DELETE /bookings/:id/student
--------------------------------------------------------- */
router.delete("/:id/student", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Not found" });

    if (booking.student.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your booking" });

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Booking removed" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   DELETE /bookings/:id (Admin)
--------------------------------------------------------- */
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ msg: "Admin only" });

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
