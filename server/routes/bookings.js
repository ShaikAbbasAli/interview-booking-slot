import express from "express";
import auth from "../middleware/auth.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* ---------------------------------------------------------
   IST <-> UTC HELPERS
--------------------------------------------------------- */

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

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

/* Extract IST midnight range in UTC */
function dayStartEndIST(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);

  const fakeUTC = new Date(Date.UTC(y, m - 1, d, 0, 0));
  const start = new Date(fakeUTC.getTime() - IST_OFFSET);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

function isAlignedTo30IST(dateUTC) {
  const ms = dateUTC.getTime() + IST_OFFSET;
  const ist = new Date(ms);
  const mins = ist.getUTCMinutes();
  return mins === 0 || mins === 30;
}

function inWorkingHoursIST(dateUTC) {
  const ms = dateUTC.getTime() + IST_OFFSET;
  const ist = new Date(ms);
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 540 && mins < 1260; // 9 AM – 9 PM IST
}

/* ---------------------------------------------------------
   GET /bookings/me
--------------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const list = await Booking.find({ student: req.user._id })
      .sort({ slotStart: 1 })
      .lean();

    res.json(
      list.map((b) => ({
        ...b,
        slotStart: toISTString(new Date(b.slotStart)),
        slotEnd: toISTString(new Date(b.slotEnd)),
      }))
    );
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   GET /bookings/slots
--------------------------------------------------------- */
router.get("/slots", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: "Date required" });

    // Only approved students may view slots
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
      }));
    }

    res.json(slots);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ---------------------------------------------------------
   POST /bookings — block past slots
--------------------------------------------------------- */
router.post("/", auth, async (req, res) => {
  try {
    const { slotStart, slotEnd, company, round } = req.body;

    if (!slotStart || !slotEnd || !company || !round)
      return res.status(400).json({ msg: "Missing fields" });

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    // ⛔ BLOCK PAST BOOKINGS
    const nowIST = new Date(Date.now() + IST_OFFSET);
    const sIST = new Date(s.getTime() + IST_OFFSET);
    if (sIST < nowIST) {
      return res.status(400).json({ msg: "Cannot book past slots." });
    }

    if (e <= s)
      return res.status(400).json({ msg: "End must be after start" });

    if (!isAlignedTo30IST(s) || !isAlignedTo30IST(e))
      return res.status(400).json({ msg: "Times must align to :00/:30" });

    if (!inWorkingHoursIST(s) || !inWorkingHoursIST(new Date(e - 1)))
      return res.status(400).json({ msg: "Out of allowed hours" });

    // Continue with existing validations…

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
   PUT /bookings/:id — block editing past slots
--------------------------------------------------------- */
router.put("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Not found" });

    if (booking.student.toString() !== req.user._id.toString())
      return res.status(403).json({ msg: "Not your booking" });

    const { slotStart, slotEnd, company, round } = req.body;
    if (!slotStart || !slotEnd || !company || !round)
      return res.status(400).json({ msg: "Missing fields" });

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    // ⛔ BLOCK PAST EDITS
    const nowIST = new Date(Date.now() + IST_OFFSET);
    const sIST = new Date(s.getTime() + IST_OFFSET);
    if (sIST < nowIST) {
      return res.status(400).json({ msg: "Cannot edit past slots." });
    }

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

export default router;
