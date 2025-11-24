import express from "express";
import auth from "../middleware/auth.js";
import Booking from "../models/Booking.js";

const router = express.Router();

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, "0");

/* IST string -> UTC Date */
function istStringToUTC(iso) {
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  const fakeUTC = new Date(Date.UTC(y, m - 1, d, hh, mm));
  return new Date(fakeUTC.getTime() - IST_OFFSET);
}

/* UTC -> IST string */
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

/* Midnight IST range in UTC */
function dayStartEndIST(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);

  const fakeUTC = new Date(Date.UTC(y, m - 1, d, 0, 0));
  const start = new Date(fakeUTC.getTime() - IST_OFFSET);
  const end = new Date(start.getTime() + 86400000);

  return { start, end };
}

function isAlignedTo30IST(dateUTC) {
  const ms = dateUTC.getTime() + IST_OFFSET;
  const ist = new Date(ms);
  const m = ist.getUTCMinutes();
  return m === 0 || m === 30;
}

function inWorkingHoursIST(dateUTC) {
  const ms = dateUTC.getTime() + IST_OFFSET;
  const ist = new Date(ms);
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 540 && mins < 1260; // 9–21
}

/* ============ GET /bookings/me ============ */
router.get("/me", auth, async (req, res) => {
  try {
    const list = await Booking.find({ student: req.user._id })
      .sort({ slotStart: -1 })
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

/* ============ GET /bookings/slots ============ */
router.get("/slots", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ msg: "Date required" });

    const { start: dayStartUTC } = dayStartEndIST(date);

    const slots = [];
    let curUTC = new Date(dayStartUTC.getTime() + 9 * 3600000);
    const endUTC = new Date(dayStartUTC.getTime() + 21 * 3600000);

    while (curUTC < endUTC) {
      const next = new Date(curUTC.getTime() + 30 * 60000);
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
      slot.bookings = overlapping.map((b) => {
        const durationMin =
          (new Date(b.slotEnd) - new Date(b.slotStart)) / 60000;

        return {
          _id: b._id,
          student: b.student,
          company: b.company,
          round: b.round,
          duration: durationMin,
        };
      });
    }

    res.json(slots);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ============ POST /bookings ============ */
router.post("/", auth, async (req, res) => {
  try {
    const { slotStart, slotEnd, company, round } = req.body;

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    const nowIST = new Date(Date.now() + IST_OFFSET);
    const sIST = new Date(s.getTime() + IST_OFFSET);

    if (sIST < nowIST)
      return res.status(400).json({ msg: "Cannot book past slots." });

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

/* ============ PUT /bookings/:id ============ */
router.put("/:id", auth, async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ msg: "Not found" });

    const { slotStart, slotEnd, company, round } = req.body;

    const s = istStringToUTC(slotStart);
    const e = istStringToUTC(slotEnd);

    const nowIST = new Date(Date.now() + IST_OFFSET);
    const sIST = new Date(s.getTime() + IST_OFFSET);
    if (sIST < nowIST)
      return res.status(400).json({ msg: "Cannot edit past slots." });

    b.slotStart = s;
    b.slotEnd = e;
    b.company = company;
    b.round = round;

    await b.save();
    res.json(b);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ============ DELETE (student) ============ */
router.delete("/:id/student", auth, async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ msg: "Not found" });

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ msg: "Booking removed" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
