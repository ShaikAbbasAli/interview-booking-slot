import express from "express";
import auth from "../middleware/auth.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* ---------------------------------------------------------
   IST <-> UTC HELPERS
--------------------------------------------------------- */

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5h30m

const pad = (n) => String(n).padStart(2, "0");

/* Convert IST string -> UTC Date */
function istStringToUTC(iso) {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  const fakeUTC = new Date(Date.UTC(y, m - 1, d, hh, mm));
  return new Date(fakeUTC.getTime() - IST_OFFSET);
}

/* Convert UTC Date -> IST "YYYY-MM-DDTHH:mm" */
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

/* Midnight of IST day in UTC */
function dayStartEndIST(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);

  const fakeUTC = new Date(Date.UTC(y, m - 1, d, 0, 0));
  const start = new Date(fakeUTC.getTime() - IST_OFFSET);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

/* Check alignment (:00 or :30) in IST */
function isAlignedTo30IST(dateUTC) {
  const t = new Date(dateUTC.getTime() + IST_OFFSET);
  const mins = t.getUTCMinutes();
  return mins === 0 || mins === 30;
}

/* Check working hours (9 AM – 9 PM IST) */
function inWorkingHoursIST(dateUTC) {
  const t = new Date(dateUTC.getTime() + IST_OFFSET);
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  return mins >= 540 && mins < 1260; // 09:00–21:00
}

/* ---------------------------------------------------------
   GET /bookings/me (return IST)
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
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET /bookings/slots?date=YYYY-MM-DD (returns IST)
--------------------------------------------------------- */
router.get("/slots", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: "Date required" });

    // student must be approved
    if (req.user.role === "student" && req.user.status !== "approved") {
      return res.status(403).json({ msg: "Account not approved" });
    }

    const { start: dayStartUTC } = dayStartEndIST(date);
    const slots = [];

    let curUTC = new Date(dayStartUTC.getTime() + 9 * 3600000);
    const endUTC = new Date(dayStartUTC.getTime() + 21 * 3600000);

    while (curUTC < endUTC) {
      let next = new Date(curUTC.getTime() + 30 * 60000);
      if (next > endUTC) break;

      slots.push({
        slotStart: toISTString(curUTC),
        slotEnd: toISTString(next),
        bookingsCount: 0,
        bookings: [],
      });

      curUTC = next;
    }

    const { start: rangeStart, end: rangeEnd } = dayStartEndIST(date);

    const bookings = await Booking.find({
      slotStart: { $lt: rangeEnd },
      slotEnd: { $gt: rangeStart },
    })
      .populate("student", "name course")
      .lean();

    // Attach bookings to slots (with correct IST times)
    for (const slot of slots) {
      const wsUTC = istStringToUTC(slot.slotStart);
      const weUTC = istStringToUTC(slot.slotEnd);

      const overlapping = bookings.filter(
        (b) =>
          new Date(b.slotStart) < weUTC &&
          new Date(b.slotEnd) > wsUTC
      );

      slot.bookingsCount = overlapping.length;

      // IMPORTANT: Include slotStart & slotEnd to avoid crash
      slot.bookings = overlapping.map((b) => ({
        _id: b._id,
        student: b.student,
        company: b.company,
        round: b.round,
        slotStart: toISTString(new Date(b.slotStart)),
        slotEnd: toISTString(new Date(b.slotEnd)),
      }));
    }

    res.json(slots);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   POST /bookings (IST input -> UTC save)
--------------------------------------------------------- */
router.post("/", auth, async (req, res) => {
  try {
    const { slotStart, slotEnd, company, round } = req.body;

    if (req.user.role !== "student" || req.user.status !== "approved") {
      return res.status(403).json({ msg: "Only approved students may book" });
    }

    if (!slotStart || !slotEnd || !company || !round)
      return res.status(400).json({ msg: "Missing fields" });

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    if (isNaN(s) || isNaN(e))
      return res.status(400).json({ msg: "Invalid date" });

    if (e <= s)
      return res.status(400).json({ msg: "End must be after start" });

    if (!isAlignedTo30IST(s) || !isAlignedTo30IST(e))
      return res.status(400).json({ msg: "Times must align to :00/:30" });

    if (!inWorkingHoursIST(s) || !inWorkingHoursIST(new Date(e - 1)))
      return res.status(400).json({ msg: "Out of allowed hours (9 AM – 9 PM IST)" });

    const dateIST = slotStart.slice(0, 10);
    const { start, end } = dayStartEndIST(dateIST);

    const todaysCount = await Booking.countDocuments({
      student: req.user._id,
      slotStart: { $gte: start, $lt: end },
    });

    if (todaysCount >= 5)
      return res.status(400).json({ msg: "Daily limit reached (5)" });

    const windows = [];
    let cur = new Date(s);
    while (cur < e) {
      let next = new Date(cur.getTime() + 30 * 60000);
      windows.push({ start: cur, end: next });
      cur = next;
    }

    for (const w of windows) {
      const c = await Booking.countDocuments({
        slotStart: { $lt: w.end },
        slotEnd: { $gt: w.start },
      });
      if (c >= 6) {
        const ist = new Date(w.start.getTime() + IST_OFFSET);
        return res.status(409).json({
          msg: `Window full: ${ist.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
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

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   PUT /bookings/:id (IST input -> UTC save)
--------------------------------------------------------- */
router.put("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ msg: "Not found" });

    if (booking.student.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your booking" });

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round)
      return res.status(400).json({ msg: "Missing fields" });

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    if (isNaN(s) || isNaN(e))
      return res.status(400).json({ msg: "Invalid date" });

    if (e <= s)
      return res.status(400).json({ msg: "End must be after start" });

    if (!isAlignedTo30IST(s) || !isAlignedTo30IST(e))
      return res.status(400).json({ msg: "Times must align" });

    if (!inWorkingHoursIST(s) || !inWorkingHoursIST(new Date(e - 1)))
      return res.status(400).json({ msg: "Out of allowed hours" });

    booking.slotStart = s;
    booking.slotEnd = e;
    booking.company = company;
    booking.round = round;

    await booking.save();
    res.json(booking);
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   DELETE /bookings/:id — Admin delete
--------------------------------------------------------- */
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ msg: "Admin only" });

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
