export default function SeatMap({ seats, selected, onToggle }) {
  return (
    <>
      <div className="seatmap">
        {seats.map((s) => (
          <div
            key={s.seat_number}
            className={`seat ${s.status === 'Booked' ? 'booked' : selected.includes(s.seat_number) ? 'sel' : 'avail'}`}
            onClick={() => s.status !== 'Booked' && onToggle(s.seat_number)}
          >
            {s.seat_number}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 6 }}>
        🟩 Selected · ⬜ Available · ◻️ Booked
      </div>
    </>
  );
}
