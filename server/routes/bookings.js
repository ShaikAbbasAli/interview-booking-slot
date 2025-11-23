import express from "express";
import auth from "../middleware/auth.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* ---------------------------------------------------------
   IST / UTC HELPERS
   - Frontend sends IST like "2025-11-23T15:00"
   - Backend converts IST -> UTC for DB
   - Backend converts UTC -> IST when sending to frontend
--------------------------------------------------------- */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Convert IST "YYYY-MM-DDTHH:mm" string -> UTC Date
 * e.g. "2025-11-23T15:00" (IST) -> 2025-11-23T09:30:00.000Z
 */
function istStringToUTC(iso) {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  // Build an intermediate Date as if the IST time were UTC
  const utcAsIST = new Date(Date.UTC(y, m - 1, d, hh, mm));
  // Then subtract IST offset to get the actual UTC instant
  return new Date(utcAsIST.getTime() - IST_OFFSET_MS);
}

/**
 * Convert UTC Date -> IST "YYYY-MM-DDTHH:mm" string
 */
function toISTString(dateUTC) {
  const istMs = dateUTC.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);

  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth() + 1;
  const d = ist.getUTCDate();
  const hh = ist.getUTCHours();
  const mm = ist.getUTCMinutes();

  return (
    y +
    "-" +
    pad(m) +
    "-" +
    pad(d) +
    "T" +
    pad(hh) +
    ":" +
    pad(mm)
  );
}

/**
 * Check alignment to :00 or :30 in IST
 */
function isAlignedTo30IST(dateUTC) {
  const istMs = dateUTC.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  const mins = ist.getUTCMinutes();
  return mins === 0 || mins === 30;
}

/**
 * Working hours in IST: 09:00 <= time < 21:00
 */
function inWorkingHoursIST(dateUTC) {
  const istMs = dateUTC.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  const totalMins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return totalMins >= 9 * 60 && totalMins < 21 * 60;
}

/**
 * Given an IST calendar date string "YYYY-MM-DD", return
 * UTC start/end of that IST day.
 *  - start = that date at 00:00 IST in UTC
 *  - end = next date at 00:00 IST in UTC
 */
function dayStartEndIST(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);

  // "00:00 IST" taken as UTC, then minus offset => real UTC instant
  const utcAsISTMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0));
  const startUTC = new Date(utcAsISTMidnight.getTime() - IST_OFFSET_MS);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

  return { start: startUTC, end: endUTC };
}

/* ---------------------------------------------------------
   GET /bookings/me — student bookings (return in IST)
--------------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const list = await Booking.find({ student: req.user._id })
      .sort({ slotStart: 1 })
      .lean();

    // Convert stored UTC dates to IST strings for the frontend
    const mapped = list.map((b) => ({
      ...b,
      slotStart: toISTString(new Date(b.slotStart)),
      slotEnd: toISTString(new Date(b.slotEnd)),
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET /bookings/slots?date=YYYY-MM-DD
   Generate 9AM → 9PM slots in IST (no "Z" on frontend)
--------------------------------------------------------- */
router.get("/slots", auth, async (req, res) => {
  try {
    const { date } = req.query; // "YYYY-MM-DD" in IST (from frontend)
    if (!date) return res.status(400).json({ msg: "Date required" });

    if (req.user.role === "student" && req.user.status !== "approved") {
      return res.status(403).json({ msg: "Account not approved" });
    }

    // Day bounds in UTC for that IST date
    const { start: dayStartUTC, end: dayEndUTC } = dayStartEndIST(date);

    // Generate 30-min windows from 09:00 to 21:00 IST.
    // In UTC: start from dayStartUTC + 9h, end before dayStartUTC + 21h.
    const slots = [];
    let curUTC = new Date(dayStartUTC.getTime() + 9 * 60 * 60 * 1000);
    const limitUTC = new Date(dayStartUTC.getTime() + 21 * 60 * 60 * 1000);

    while (curUTC < limitUTC) {
      const endUTC = new Date(curUTC.getTime() + 30 * 60000);
      if (endUTC > limitUTC) break;

      slots.push({
        slotStart: toISTString(curUTC), // send as IST string
        slotEnd: toISTString(endUTC),   // send as IST string
        bookingsCount: 0,
        bookings: [],
      });

      curUTC = endUTC;
    }

    // Load bookings from DB in that UTC day range
    const bookings = await Booking.find({
      slotStart: { $lt: dayEndUTC },
      slotEnd: { $gt: dayStartUTC },
    })
      .populate("student", "name course")
      .lean();

    // Attach bookings to each slot (all overlap checks in UTC)
    for (const slot of slots) {
      const wsUTC = istStringToUTC(slot.slotStart);
      const weUTC = istStringToUTC(slot.slotEnd);

      const overlapping = bookings.filter(
        (b) =>
          new Date(b.slotStart) < weUTC && new Date(b.slotEnd) > wsUTC
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
   - Frontend sends IST "YYYY-MM-DDTHH:mm"
   - Backend converts IST -> UTC before saving
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

    // Convert IST string -> UTC Date
    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    if (isNaN(s) || isNaN(e)) {
      return res.status(400).json({ msg: "Invalid date" });
    }
    if (e <= s) {
      return res.status(400).json({ msg: "End must be after start" });
    }

    if (!isAlignedTo30IST(s) || !isAlignedTo30IST(e)) {
      return res
        .status(400)
        .json({ msg: "Times must align to :00 or :30" });
    }

    if (!inWorkingHoursIST(s) || !inWorkingHoursIST(new Date(e.getTime() - 1))) {
      return res
        .status(400)
        .json({ msg: "Out of allowed hours (9 AM – 9 PM IST)" });
    }

    // Daily limit: 5 bookings per student (based on IST date)
    const dateOnlyIST = slotStart.slice(0, 10); // "YYYY-MM-DD"
    const { start: dayStartUTC, end: dayEndUTC } = dayStartEndIST(dateOnlyIST);

    const todaysCount = await Booking.countDocuments({
      student: req.user._id,
      slotStart: { $gte: dayStartUTC, $lt: dayEndUTC },
    });
    if (todaysCount >= 5) {
      return res.status(400).json({ msg: "Daily limit reached (5)" });
    }

    // Windows covered by booking (for capacity 6) – in UTC
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
        // Display time in IST for the error message
        const istDisplay = new Date(w.start.getTime() + IST_OFFSET_MS);
        return res.status(409).json({
          msg: `Window full: ${istDisplay.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}`,
        });
      }
    }

    const booking = await Booking.create({
      student: req.user._id,
      slotStart: s, // UTC
      slotEnd: e,   // UTC
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
   PUT /bookings/:id — Student edit booking (IST on wire)
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

    // IST string -> UTC Date
    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    if (isNaN(s) || isNaN(e)) {
      return res.status(400).json({ msg: "Invalid date" });
    }
    if (e <= s) {
      return res.status(400).json({ msg: "End must be after start" });
    }

    if (!isAlignedTo30IST(s) || !isAlignedTo30IST(e)) {
      return res.status(400).json({ msg: "Times must align" });
    }

    if (!inWorkingHoursIST(s) || !inWorkingHoursIST(new Date(e.getTime() - 1))) {
      return res
        .status(400)
        .json({ msg: "Out of allowed hours (9 AM – 9 PM IST)" });
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
        const istDisplay = new Date(w.start.getTime() + IST_OFFSET_MS);
        return res.status(409).json({
          msg: `Window full: ${istDisplay.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}`,
        });
      }
    }

    booking.slotStart = s; // UTC
    booking.slotEnd = e;   // UTC
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
