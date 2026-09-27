import { useEffect, useMemo, useState } from 'react';
import { useLookups } from '../context/LookupsContext';
import * as scheduleApi from '../api/scheduleApi';
import * as bookingApi from '../api/bookingApi';
import { routeName, vehName, drvName, money, fmtDT } from '../utils/lookups';
import { normalizeText, PERSON_NAME_PATTERN, PHONE_PATTERN } from '../utils/validation';
import SeatMap from '../components/SeatMap';
import Modal from '../components/Modal';

export default function Booking() {
  const { routes, vehicles, drivers } = useLookups();
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [passengers, setPassengers] = useState({});
  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState('');

  const routeOptions = useMemo(() => {
    return routes.filter((route) => route.status === 'Active');
  }, [routes]);

  useEffect(() => {
    scheduleApi.listSchedules().then((r) => {
      const open = r.data.filter((s) => s.status === 'Open');
      setSchedules(open);
    });
  }, []);

  const availableDates = useMemo(() => {
    const dates = [...new Set(schedules.map((s) => s.departure_datetime.slice(0, 10)))];
    return dates.sort();
  }, [schedules]);

  useEffect(() => {
    if (!availableDates.length) {
      setSelectedDate('');
      return;
    }
    if (!selectedDate || !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (!routeOptions.length) {
      setSelectedRouteId('');
      return;
    }
    if (!selectedRouteId || !routeOptions.some((route) => String(route.id) === String(selectedRouteId))) {
      setSelectedRouteId(routeOptions[0].id);
    }
  }, [routeOptions, selectedRouteId]);

  const availableSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesDate = !selectedDate || s.departure_datetime.slice(0, 10) === selectedDate;
      const matchesRoute = !selectedRouteId || String(s.route_id) === String(selectedRouteId);
      return matchesDate && matchesRoute;
    });
  }, [schedules, selectedDate, selectedRouteId]);

  useEffect(() => {
    if (!availableSchedules.length) {
      setScheduleId('');
      setSelected([]);
      setPassengers({});
      return;
    }
    if (!scheduleId || !availableSchedules.some((s) => String(s.id) === String(scheduleId))) {
      setScheduleId(availableSchedules[0].id);
    }
  }, [availableSchedules, scheduleId]);

  function loadSeats(id) {
    scheduleApi.getScheduleSeats(id).then((r) => setSeats(r.data));
  }
  useEffect(() => { if (scheduleId) loadSeats(scheduleId); }, [scheduleId]);

  function toggleSeat(no) {
    setSelected((s) => (s.includes(no) ? s.filter((x) => x !== no) : [...s, no]));
  }

  const currentSchedule = availableSchedules.find((s) => String(s.id) === String(scheduleId)) || schedules.find((s) => String(s.id) === String(scheduleId));

  async function confirm() {
    setErr('');
    const list = selected.map((seat_number) => {
      const passenger = passengers[seat_number] || {};
      const cnicDigits = (passenger.cnic || '').replace(/\D/g, '');
      return {
        seat_number,
        ...passenger,
        name: normalizeText(passenger.name || ''),
        cnic: cnicDigits ? `${cnicDigits.slice(0, 5)}-${cnicDigits.slice(5, 12)}-${cnicDigits.slice(12)}` : ''
      };
    });
    if (!list.length) return setErr('Select at least one seat.');
    try {
      const { data } = await bookingApi.createBooking(scheduleId, list);
      setTicket({ ...data, passengers: list, fare_per_seat: currentSchedule.fare });
      setSelected([]);
      setPassengers({});
      loadSeats(scheduleId);
    } catch (e) {
      setErr(e.message);
      loadSeats(scheduleId); // refresh in case someone else took the seat
    }
  }

  function updatePax(seat, field, value) {
    setPassengers((p) => ({ ...p, [seat]: { ...p[seat], [field]: value } }));
  }

  return (
    <>
      <div className="ph"><div><h2>Ticket Booking</h2><p>Select a schedule, choose seats, enter passengers</p></div></div>
      <div className="grid2">
        <div className="card">
          <div className="hd"><h3>1. Select Schedule</h3></div>
          <div className="bd">
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div className="fld">
                <label>Date</label>
                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                  {availableDates.map((date) => (
                    <option key={date} value={date}>{new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label>Route</label>
                <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)}>
                  {routeOptions.map((route) => (
                    <option key={route.id} value={route.id}>{route.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <select value={scheduleId} onChange={(e) => { setScheduleId(e.target.value); setSelected([]); }}>
                  {availableSchedules.map((s) => (
                <option key={s.id} value={s.id}>{routeName(s.route_id, routes)} · {fmtDT(s.departure_datetime)} · {vehName(s.vehicle_id, vehicles)}</option>
              ))}
            </select>
            {!availableSchedules.length && (
              <div className="empty" style={{ marginTop: 12 }}>No buses available for the selected route and date.</div>
            )}
            {currentSchedule && (
              <>
                <div style={{ marginTop: 14, fontSize: 13, color: 'var(--slate)' }}>
                  Vehicle: <b>{vehName(currentSchedule.vehicle_id, vehicles)}</b> · Driver: <b>{drvName(currentSchedule.driver_id, drivers)}</b> · Fare: <b>{money(currentSchedule.fare)}</b>/seat
                </div>
                <SeatMap seats={seats} selected={selected} onToggle={toggleSeat} />
              </>
            )}
          </div>
        </div>
        <div className="card">
          <div className="hd"><h3>2. Passenger Details</h3></div>
          <div className="bd">
            {selected.length ? (
              <>
                <form onSubmit={(event) => { event.preventDefault(); confirm(); }}>
                {selected.map((sn) => (
                  <div key={sn} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                    <b style={{ fontSize: 12, color: 'var(--brand-d)' }}>Seat {sn}</b>
                    <div className="grid2" style={{ marginTop: 6 }}>
                      <div className="fld"><label>Passenger Name</label><input required maxLength={80} pattern={PERSON_NAME_PATTERN} title="Use letters, spaces, apostrophes, and hyphens." placeholder="Amina Khan" value={passengers[sn]?.name || ''} onChange={(e) => updatePax(sn, 'name', e.target.value)} /></div>
                      <div className="fld"><label>CNIC</label><input pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" title="Enter 13 digits, optionally formatted as 12345-1234567-1." placeholder="35202-1234567-1 (optional)" value={passengers[sn]?.cnic || ''} onChange={(e) => updatePax(sn, 'cnic', e.target.value)} /></div>
                      <div className="fld"><label>Mobile</label><input type="tel" pattern={PHONE_PATTERN} title="Enter a phone number with at least 7 digits." placeholder="0300 1234567 (optional)" value={passengers[sn]?.mobile_number || ''} onChange={(e) => updatePax(sn, 'mobile_number', e.target.value)} /></div>
                      <div className="fld"><label>Gender</label>
                        <select required value={passengers[sn]?.gender || ''} onChange={(e) => updatePax(sn, 'gender', e.target.value)}><option value="">Select gender</option><option value="M">Male</option><option value="F">Female</option></select>
                      </div>
                    </div>
                  </div>
                ))}
                {err && <div className="err" style={{ display: 'block' }}>{err}</div>}
                <button type="submit" className="btn" style={{ width: '100%' }}>Confirm Booking & Receive Cash</button>
                </form>
              </>
            ) : (
              <div className="empty">Select seats on the seat map to begin.</div>
            )}
          </div>
        </div>
      </div>

      {ticket && (
        <Modal title={`Ticket — ${ticket.ticket_number}`} onClose={() => setTicket(null)} onConfirm={() => window.print()} confirmLabel="Print Ticket">
          <div className="ticket">
            <h4>🚌 Iqbal Travels</h4>
            <div className="row"><span>Ticket No.</span><b>{ticket.ticket_number}</b></div>
            <div className="row"><span>Passenger(s)</span><b>{ticket.passengers.map((p) => `${p.name} (${p.seat_number})`).join(', ')}</b></div>
            <div className="row"><span>Route</span><b>{routeName(currentSchedule?.route_id, routes)}</b></div>
            <div className="row"><span>Bus</span><b>{vehName(currentSchedule?.vehicle_id, vehicles)}</b></div>
            <div className="row"><span>Departure</span><b>{currentSchedule && fmtDT(currentSchedule.departure_datetime)}</b></div>
            <div className="row"><span>Fare / seat</span><b>{money(ticket.fare_per_seat)}</b></div>
            <div className="row"><span>Total Paid</span><b>{money(ticket.total_amount)}</b></div>
          </div>
        </Modal>
      )}
    </>
  );
}
