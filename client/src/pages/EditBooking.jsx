// client/src/pages/EditBooking.jsx
import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

function pad(n){ return n.toString().padStart(2,'0'); }

export default function EditBooking(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState('');
  const [round, setRound] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [duration, setDuration] = useState(30);

  useEffect(()=>{ load(); }, [id]);

  async function load(){
    try {
      setLoading(true);
      const res = await API.get('/bookings/me');
      const found = res.data.find(b => b._id === id);
      if (!found) { alert('Booking not found'); navigate('/mybookings'); return; }
      setBooking(found);
      setCompany(found.company);
      setRound(found.round);
      const s = new Date(found.slotStart);
      setDate(format(s,'yyyy-MM-dd'));
      setHour(pad(s.getHours()));
      setMinute(pad(s.getMinutes()));
      const diff = (new Date(found.slotEnd) - new Date(found.slotStart))/60000;
      setDuration(diff);
    } catch (err) {
      console.error(err);
      alert('Failed to load booking');
      navigate('/mybookings');
    } finally { setLoading(false); }
  }

  async function submit(e){
    e.preventDefault();
    try {
      const startISO = new Date(`${date}T${pad(hour)}:${minute}:00`);
      const end = new Date(startISO.getTime() + duration*60000);
      await API.put(`/bookings/${id}`, { slotStart: startISO.toISOString(), slotEnd: end.toISOString(), company, round });
      alert('Booking updated.');
      navigate('/mybookings');
    } catch (err) {
      alert(err.response?.data?.msg || err.message);
    }
  }

  async function remove(){
    if (!confirm('Delete this booking?')) return;
    try {
      await API.delete(`/bookings/${id}`);
      alert('Deleted');
      navigate('/mybookings');
    } catch (err) {
      alert(err.response?.data?.msg || err.message);
    }
  }

  if (loading) return <div className="p-4 bg-slate-700 rounded">Loading…</div>;
  if (!booking) return null;

  const hours = Array.from({length: 12}, (_,i)=>i+9);
  const minutes = ['00','30'];

  return (
    <form onSubmit={submit} className="max-w-md mx-auto bg-slate-800 p-6 rounded">
      <h2 className="text-xl mb-4">Edit Booking</h2>

      <label className="block text-sm mb-1">Date</label>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-2 mb-3 rounded bg-slate-700" />

      <div className="flex gap-2 mb-3">
        <select value={hour} onChange={e=>setHour(e.target.value)} className="flex-1 p-2 rounded bg-slate-700">
          {hours.map(h=> <option key={h} value={pad(h)}>{pad(h)}</option>)}
        </select>
        <select value={minute} onChange={e=>setMinute(e.target.value)} className="w-28 p-2 rounded bg-slate-700">
          {minutes.map(m=> <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={duration} onChange={e=>setDuration(Number(e.target.value))} className="w-36 p-2 rounded bg-slate-700">
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Company</label>
        <input value={company} onChange={e=>setCompany(e.target.value)} className="w-full p-2 rounded bg-slate-700" />
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Round</label>
        <input value={round} onChange={e=>setRound(e.target.value)} className="w-full p-2 rounded bg-slate-700" />
      </div>

      <div className="flex gap-3">
        <button className="px-3 py-1 bg-blue-600 rounded">Save</button>
        <button type="button" onClick={remove} className="px-3 py-1 bg-red-600 rounded">Delete</button>
      </div>
    </form>
  );
}
